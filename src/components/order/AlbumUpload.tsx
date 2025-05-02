import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Check, X, Cloud, FileIcon, FolderOpen, Archive } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [selectedFolder, setSelectedFolder] = useState<FileList | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if files were selected
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolder(e.target.files);
      // Suggest album name from folder name if not set
      if (!albumName) {
        // Get the folder name from the first file's path
        const path = e.target.files[0].webkitRelativePath;
        const folderName = path.split('/')[0];
        setAlbumName(folderName);
      }
    }
  };

  const convertFolderToZip = async () => {
    if (!selectedFolder || selectedFolder.length === 0) {
      toast({
        title: "No folder selected",
        description: "Please select a folder first",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);

    try {
      // Show progress update
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 5;
        if (currentProgress > 95) {
          clearInterval(progressInterval);
        } else {
          setConversionProgress(currentProgress);
        }
      }, 100);

      // Create JSZip instance in the browser
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Get folder name from the first file's path
      const folderName = selectedFolder[0].webkitRelativePath.split('/')[0];
      
      // Add each file to the zip
      for (let i = 0; i < selectedFolder.length; i++) {
        const fileObj = selectedFolder[i];
        // Get the file path relative to the folder
        const relativePath = fileObj.webkitRelativePath.substring(folderName.length + 1);
        
        // Read file content
        const fileContent = await fileObj.arrayBuffer();
        // Add file to zip with its relative path
        zip.file(relativePath, fileContent);
      }
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      }, (metadata) => {
        setConversionProgress(Math.floor(metadata.percent));
      });
      
      // Create a File object from the zip blob
      const zipFile = new File(
        [zipBlob], 
        `${folderName}.zip`, 
        { type: "application/zip" }
      );

      // Clear the interval and set final progress
      clearInterval(progressInterval);
      setConversionProgress(100);
      
      // Validate and set the zip file
      validateAndSetFile(zipFile);
      
      toast({
        title: "Folder Converted",
        description: `${folderName} successfully converted to ZIP format`,
      });
    } catch (error) {
      console.error("Error converting folder to zip:", error);
      toast({
        title: "Conversion Failed",
        description: "There was an error converting your folder to ZIP format",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Log file details for debugging
    console.log('Validating file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type
    });
    
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
      // Create a FormData object to send the file
      const formData = new FormData();
      
      // Log detailed file information for debugging
      console.log('File upload details:', {
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
        lastModified: new Date(fileToUpload.lastModified).toISOString()
      });
        
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
          description: "The upload is taking too long. Try uploading a smaller file.",
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
          toast({
            title: "Upload Successful",
            description: "Your album was successfully uploaded to Google Drive",
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
        
        // Extract detailed error message if available
        const errorDetail = error.response?.data?.detail || error.response?.data?.error || '';
        const errorMessage = error.response?.data?.message || 'Unknown server error';
        
        if (error.code === 'ERR_NETWORK') {
          toast({
            title: "Network Error",
            description: "Lost connection to the server. Check your network connection and try again.",
            variant: "destructive",
          });
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          toast({
            title: "Upload Timeout",
            description: "The upload timed out. Try uploading a smaller file.",
            variant: "destructive",
          });
        } else if (error.response?.status === 413) {
          toast({
            title: "Upload Too Large",
            description: "The file is too large. Try uploading a smaller file.",
            variant: "destructive",
          });
        } else if (error.response?.status === 500) {
          toast({
            title: "Server Error",
            description: `${errorMessage}${errorDetail ? ': ' + errorDetail : ''}`,
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
          description: error.message || "There was an unknown error during upload. Try again.",
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
    
    // Always use Google Drive upload for all files
    uploadToGoogleDrive(file);
  };

  const clearFile = () => {
    setFile(null);
    setUseGoogleDrive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFolder = () => {
    setSelectedFolder(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClickSelectFolder = () => {
    if (folderInputRef.current) {
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

      <div className="space-y-2">
        <Label>Upload Album File</Label>
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
          {/* Regular file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".zip,.rar,.7z,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif"
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
                <X className="h-4 w-4 mr-2" /> Remove File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-muted p-2 rounded-full mb-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Drag and drop your album file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: ZIP, RAR, 7Z, PDF, JPG, PNG, WEBP, GIF and other image formats
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

      {/* Folder to ZIP conversion section */}
      <div className="mt-6 pt-4 border-t border-dashed">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Convert Folder to ZIP
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Have a folder of images? Convert it to ZIP format for easy upload
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory="true"
              directory="true"
              className="hidden"
              onChange={handleFolderSelect}
            />

            {selectedFolder ? (
              <div className="border rounded-md p-4 bg-slate-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{selectedFolder[0]?.webkitRelativePath.split('/')[0]}</p>
                      <p className="text-xs text-muted-foreground">{selectedFolder.length} files selected</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFolder}
                    disabled={isConverting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {isConverting && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span>Converting to ZIP...</span>
                      <span>{Math.round(conversionProgress)}%</span>
                    </div>
                    <Progress value={conversionProgress} className="h-1 mt-1" />
                  </div>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleClickSelectFolder}
              >
                <FolderOpen className="h-4 w-4" />
                Select Folder
              </Button>
            )}

            {selectedFolder && !isConverting && (
              <Button 
                type="button"
                className="w-full"
                onClick={convertFolderToZip}
                disabled={!selectedFolder}
              >
                <Archive className="h-4 w-4 mr-2" />
                Convert to ZIP and Select
              </Button>
            )}
          </div>
        </div>
      </div>

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