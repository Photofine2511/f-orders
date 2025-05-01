import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Check, X, Cloud, Folder, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Album } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import api from "@/lib/api";

// Add directory support for the file input
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // Add non-standard attributes for directory selection
    webkitdirectory?: string;
    directory?: string;
  }
}

interface AlbumUploadProps {
  onAlbumUploaded: (albumName: string, file: File, driveFileId?: string) => void;
}

export const AlbumUpload = ({ onAlbumUploaded }: AlbumUploadProps) => {
  const { toast } = useToast();
  const [albumName, setAlbumName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useGoogleDrive, setUseGoogleDrive] = useState(false);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if files were selected
    if (e.target.files && e.target.files.length > 0) {
      // If multiple files were selected (directory upload)
      if (e.target.files.length > 1 && e.target.files[0].webkitRelativePath) {
        // Create a "virtual" folder file
        const folderName = e.target.files[0].webkitRelativePath.split('/')[0];
        let totalSize = 0;
        
        // Calculate total size of all files
        for (let i = 0; i < e.target.files.length; i++) {
          totalSize += e.target.files[i].size;
        }
        
        // Create a custom File object to represent the folder
        const folderFile = new File(
          [new Blob()], // Empty content
          folderName,   // Use the folder name
          { type: 'application/x-directory' }
        );
        
        // Add custom properties to track the files inside
        const customFolderFile = Object.defineProperties(folderFile, {
          size: { value: totalSize },
          isFolder: { value: true },
          fileCount: { value: e.target.files.length },
          files: { value: e.target.files }
        });
        
        validateAndSetFile(customFolderFile);
      } else {
        // Single file case
        validateAndSetFile(e.target.files[0]);
      }
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Check if it's a folder (either from directory input or drag-and-drop)
    const isFolder = 
      // From directory input (property we added)
      (selectedFile as any).isFolder || 
      // From drag-and-drop (general properties)
      (selectedFile.size === 0 && selectedFile.type === '' || selectedFile.type === 'application/x-directory');
    
    // Log file details for debugging
    console.log('Validating file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      isFolder: isFolder
    });
    
    if (isFolder) {
      setFile(selectedFile);
      
      // Always use Google Drive for folders
      setUseGoogleDrive(true);
      toast({
        title: "Folder Selected",
        description: `This folder will be uploaded to Google Drive`,
      });
      
      // Set album name from folder name if not already set
      if (!albumName) {
        setAlbumName(selectedFile.name);
      }
      return;
    }
    
    // For regular files, check file type
    const validExtensions = ['.zip', '.rar', '.7z', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
    const fileName = selectedFile.name.toLowerCase();
    
    // Check if the file has a valid extension
    let isValidType = validExtensions.some(ext => fileName.endsWith(ext));
    
    // If filename doesn't have extension, check MIME type
    if (!isValidType && selectedFile.type) {
      const validMimeTypes = [
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
      ];
      isValidType = validMimeTypes.some(mime => selectedFile.type.includes(mime));
    }
    
    if (!isValidType) {
      console.warn(`Invalid file type: ${fileName} (${selectedFile.type})`);
      toast({
        title: "Invalid file type",
        description: `File type not supported. Please upload a ZIP, RAR, 7Z, PDF, or image file. File name: ${fileName}, MIME type: ${selectedFile.type || 'unknown'}`,
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size must be less than 1GB. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
        variant: "destructive",
      });
      return;
    }
    
    // File passed validation
    console.log(`File validated successfully: ${fileName} (${selectedFile.type || 'unknown type'})`);
    setFile(selectedFile);
    
    // Always use Google Drive for files
    setUseGoogleDrive(true);
    toast({
      title: "File Selected",
      description: "This file will be uploaded to Google Drive",
    });
    
    if (!albumName) {
      // Extract file name without extension
      const nameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
      setAlbumName(nameWithoutExt || selectedFile.name);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const uploadToGoogleDrive = useCallback(async (fileToUpload: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create a FormData object to send the file(s)
      const formData = new FormData();
      
      // Check if we're dealing with a folder (our custom property or standard properties)
      const isFolder = (fileToUpload as any).isFolder || 
                      (fileToUpload.size === 0 && fileToUpload.type === '' || 
                       fileToUpload.type === 'application/x-directory');
      
      // Log detailed file information for debugging
      console.log('File upload details:', {
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
        isFolder: isFolder,
        lastModified: new Date(fileToUpload.lastModified).toISOString()
      });
      
      // Add additional metadata for folders
      if (isFolder) {
        // Mark this as a folder upload
        formData.append('isFolder', 'true');
        formData.append('folderName', fileToUpload.name);
        
        // Log folder upload for debugging
        console.log(`Uploading folder: ${fileToUpload.name} with ${(fileToUpload as any).fileCount || 'unknown'} files`);
        
        // If we have the files collection from our custom folder object (from webkitdirectory)
        if ((fileToUpload as any).files && (fileToUpload as any).files.length > 0) {
          // For each file in the folder, add to formData with the same field name
          const files = (fileToUpload as any).files;
          
          console.log(`Processing ${files.length} files from folder ${fileToUpload.name}`);
          
          // Too many files might cause issues - limit to first 20 for now
          const maxFiles = Math.min(files.length, 20);
          console.log(`Limiting upload to ${maxFiles} files to prevent timeouts`);
          
          // Add each file to the formData with proper path information
          for (let i = 0; i < maxFiles; i++) {
            const file = files[i];
            
            // Skip files larger than 50MB
            if (file.size > 50 * 1024 * 1024) {
              console.warn(`Skipping large file: ${file.name} (${Math.round(file.size/1024/1024)}MB)`);
              continue;
            }
            
            // Add the relative path as part of the filename to preserve folder structure
            if (file.webkitRelativePath) {
              // Create a new file with the relative path as name to preserve structure
              const fileWithPath = new File(
                [file],
                file.webkitRelativePath, // This contains the full relative path including the file
                { type: file.type }
              );
              formData.append('albumFiles', fileWithPath);
              console.log(`Adding file with path: ${file.webkitRelativePath} (${file.size} bytes)`);
            } else {
              // If webkitRelativePath is not available, use folder name + filename
              const relativePath = `${fileToUpload.name}/${file.name}`;
              const fileWithPath = new File(
                [file],
                relativePath,
                { type: file.type }
              );
              formData.append('albumFiles', fileWithPath);
              console.log(`Adding file with constructed path: ${relativePath} (${file.size} bytes)`);
            }
          }
          
          if (maxFiles < files.length) {
            toast({
              title: "Large Folder Detected",
              description: `Uploading the first ${maxFiles} files out of ${files.length} to prevent timeout.`,
            });
          }
        } else {
          // If we don't have the files collection, log the issue
          console.error('Folder selected but no files property found', fileToUpload);
          toast({
            title: "Upload Error",
            description: "Could not access the files in the selected folder. Please try a different folder.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      } else {
        // Regular file upload
        console.log(`Regular file upload: ${fileToUpload.name} (${fileToUpload.size} bytes)`);
        
        // Make sure the file object is valid before appending
        if (fileToUpload instanceof File && fileToUpload.size > 0) {
          formData.append('albumFiles', fileToUpload);
        } else {
          console.error('Invalid file object:', fileToUpload);
          toast({
            title: "Upload Error",
            description: "Invalid file object. Please try selecting the file again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }
      
      formData.append('albumName', albumName);
      
      // Get token for authentication
      const token = localStorage.getItem('photofine_token');
      
      // Upload directly to server which will handle Google Drive upload
      console.log('Starting upload to Google Drive...');
      
      // Create a CancelToken source for timeout
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      
      // Set a timeout of 5 minutes (300000ms) for large uploads
      const timeout = setTimeout(() => {
        source.cancel('Upload timeout - operation took too long');
        toast({
          title: "Upload Timeout",
          description: "The upload is taking too long. Try uploading fewer or smaller files.",
          variant: "destructive",
        });
      }, 300000);
      
      try {
        const response = await axios.post(`${api.defaults.baseURL}/orders/upload-to-drive`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          cancelToken: source.token, // Add the cancel token for timeout
          timeout: 300000, // Also set axios timeout to 5 minutes
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeout);
        
        // Check if upload was successful
        if (response.data && response.data.success) {
          console.log('Upload successful:', response.data);
          
          // Store the Drive file ID
          const fileId = response.data.fileInfo?.id;
          if (fileId) {
            setDriveFileId(fileId);
          }
          
          // Pass the file info to parent component with the drive file ID
          onAlbumUploaded(albumName, fileToUpload, fileId);
          
          // Show detailed success message
          const isFolder = response.data.fileInfo?.isFolder;
          const fileCount = response.data.fileInfo?.fileCount || 0;
          
          toast({
            title: "Upload Successful",
            description: isFolder 
              ? `Your folder with ${fileCount} files was uploaded to Google Drive` 
              : "Your album was successfully uploaded to Google Drive",
          });
        } else {
          console.error('Upload response indicates failure:', response.data);
          throw new Error(response.data?.message || "Upload to Google Drive failed");
        }
      } catch (axiosError) {
        // Make sure to clear the timeout if there's an error
        clearTimeout(timeout);
        throw axiosError;
      }
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      
      // More detailed error logging
      if (axios.isAxiosError(error)) {
        console.error('Server response:', error.response?.data);
        console.error('Status code:', error.response?.status);
        
        if (error.code === 'ERR_NETWORK') {
          toast({
            title: "Network Error",
            description: "Lost connection to the server. Check your network connection and try again.",
            variant: "destructive",
          });
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          toast({
            title: "Upload Timeout",
            description: "The upload timed out. Try uploading fewer or smaller files.",
            variant: "destructive",
          });
        } else if (error.response?.status === 413) {
          toast({
            title: "Upload Too Large",
            description: "The files are too large. Try uploading fewer or smaller files.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Upload Failed",
            description: error.response?.data?.message || "There was an error uploading to Google Drive. Try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "There was an error uploading to Google Drive. Try again.",
          variant: "destructive",
        });
      }
      
      // Reset upload state
      setIsUploading(false);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [albumName, onAlbumUploaded, toast]);

  const handleSubmit = () => {
    if (!file || !albumName.trim()) {
      toast({
        title: "Error",
        description: "Please provide an album name and upload a file",
        variant: "destructive",
      });
      return;
    }
    
    // Always use Google Drive upload for all files and folders
    uploadToGoogleDrive(file);
  };

  const clearFile = () => {
    setFile(null);
    setUseGoogleDrive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const toggleUploadMode = () => {
    setUploadMode(prev => prev === 'file' ? 'folder' : 'file');
    clearFile();
  };

  const handleClickUpload = () => {
    if (uploadMode === 'file' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (uploadMode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="album-name">Album Name</Label>
        <Input
          id="album-name"
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
          placeholder="e.g., Wedding Photos 2023"
          className="w-full"
        />
      </div>

      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              uploadMode === 'file' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setUploadMode('file')}
          >
            <FileIcon className="w-4 h-4 mr-1 inline-block" />
            File Upload
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              uploadMode === 'folder' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setUploadMode('folder')}
          >
            <Folder className="w-4 h-4 mr-1 inline-block" />
            Folder Upload
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Upload Album {uploadMode === 'folder' ? 'Folder' : 'File'}</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : file 
                ? useGoogleDrive
                  ? "border-blue-500 bg-blue-50"
                  : "border-green-500 bg-green-50" 
                : "border-gray-300 hover:border-primary"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          {/* Regular file input - without directory attributes */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".zip,.rar,.7z,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif"
          />
          
          {/* Folder input - with directory attributes */}
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            webkitdirectory=""
            directory=""
            multiple
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full mb-2 ${useGoogleDrive ? 'bg-blue-100' : 'bg-green-100'}`}>
                {useGoogleDrive ? (
                  <Cloud className="h-6 w-6 text-blue-600" />
                ) : (
                  <Check className="h-6 w-6 text-green-600" />
                )}
              </div>
              <p className="text-sm font-medium mb-1">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {(file as any).isFolder && (file as any).fileCount && (
                  <span> • {(file as any).fileCount} files</span>
                )}
              </p>
              {useGoogleDrive && (
                <p className="text-xs text-blue-600 mt-1">
                  Will be uploaded to Google Drive
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4 mr-2" /> Remove {(file as any).isFolder ? 'Folder' : 'File'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-muted p-2 rounded-full mb-2">
                {uploadMode === 'folder' ? (
                  <Folder className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-medium">
                {uploadMode === 'folder' 
                  ? "Click to select a folder to upload" 
                  : "Drag and drop your album file here or click to browse"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                {uploadMode === 'folder' 
                  ? "Entire folder contents will be uploaded" 
                  : "Supported formats: ZIP, RAR, 7Z, PDF, JPG, PNG, WEBP, GIF and other image formats"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: 1GB (all will be uploaded to Google Drive)
              </p>
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Uploading to Google Drive...</span>
            <span className="text-sm">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      <Button 
        type="button"
        className="w-full mt-4"
        disabled={!file || !albumName.trim() || isUploading}
        onClick={handleSubmit}
      >
        {isUploading 
          ? "Uploading to Google Drive..." 
          : "Continue to Order Details"}
      </Button>
    </div>
  );
};