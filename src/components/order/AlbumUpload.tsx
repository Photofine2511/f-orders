import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Check, X, Cloud } from "lucide-react";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if files were selected
    if (e.target.files && e.target.files.length > 0) {
      // If multiple files were selected (directory upload)
      if (e.target.files.length > 1) {
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
    const validTypes = ['.zip', '.rar', '.7z', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
    const fileName = selectedFile.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP, RAR, 7Z, PDF, image file, or a folder",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 1GB",
        variant: "destructive",
      });
      return;
    }
    
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
      formData.append('albumFile', fileToUpload);
      formData.append('albumName', albumName);
      
      // Get token for authentication
      const token = localStorage.getItem('photofine_token');
      
      // Upload directly to server which will handle Google Drive upload
      const response = await axios.post(`${api.defaults.baseURL}/orders/upload-to-drive`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      
      // Check if upload was successful
      if (response.data && response.data.success) {
        // Store the Drive file ID
        const fileId = response.data.fileInfo?.id;
        if (fileId) {
          setDriveFileId(fileId);
        }
        
        // Pass the file info to parent component with the drive file ID
        onAlbumUploaded(albumName, fileToUpload, fileId);
        
        toast({
          title: "Upload Successful",
          description: "Your album was successfully uploaded to Google Drive",
        });
      } else {
        throw new Error("Upload to Google Drive failed");
      }
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      
      toast({
        title: "Upload Failed",
        description: "There was an error uploading to Google Drive. Try again or use standard upload.",
        variant: "destructive",
      });
      
      // Fall back to normal upload
      setUseGoogleDrive(false);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [albumName, onAlbumUploaded, toast]);

  const processLargeFile = useCallback(async (fileToProcess: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // For really large files (>100MB), we'll use direct chunked upload
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      const chunks = Math.ceil(fileToProcess.size / chunkSize);
      
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(fileToProcess.size, start + chunkSize);
        const chunk = fileToProcess.slice(start, end);
        
        // Simulate chunk upload - in a real implementation, you'd send each chunk to the server
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Update progress based on chunks processed
        const progress = Math.round(((i + 1) / chunks) * 100);
        setUploadProgress(progress);
      }
      
      // Once "processed", we call the onAlbumUploaded function
      onAlbumUploaded(albumName, fileToProcess);
      toast({
        title: "Album Ready",
        description: "Your album is ready for processing",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
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
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".zip,.rar,.7z,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif"
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
                  Will be uploaded to Google Drive for better reliability
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
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drag and drop your album file or folder here</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse files/folders
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: ZIP, RAR, 7Z, PDF, JPG, PNG, WEBP, GIF, folders and other image formats
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 1GB (all files will be uploaded to Google Drive)
              </p>
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">{useGoogleDrive ? "Uploading to Google Drive..." : "Processing file..."}</span>
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
          ? useGoogleDrive 
            ? "Uploading to Google Drive..." 
            : "Processing..." 
          : "Continue to Order Details"}
      </Button>
    </div>
  );
};