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

interface AlbumUploadProps {
  onAlbumUploaded: (albumName: string, file: File) => void;
}

export const AlbumUpload = ({ onAlbumUploaded }: AlbumUploadProps) => {
  const { toast } = useToast();
  const [albumName, setAlbumName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useGoogleDrive, setUseGoogleDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Check file type
    const validTypes = ['.zip', '.rar', '.7z', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
    const fileName = selectedFile.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP, RAR, 7Z, PDF, or image file (JPG, PNG, WEBP, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 500MB",
        variant: "destructive",
      });
      return;
    }
    
    setFile(selectedFile);
    
    // For large files, suggest Google Drive upload
    if (selectedFile.size > 100 * 1024 * 1024) {
      setUseGoogleDrive(true);
      toast({
        title: "Large File Detected",
        description: "This file will be uploaded directly to Google Drive for better reliability",
      });
    } else {
      setUseGoogleDrive(false);
    }
    
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
        // Pass the file info to parent component
        onAlbumUploaded(albumName, fileToUpload);
        
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
    
    // For large files, use Google Drive if available
    if (useGoogleDrive) {
      uploadToGoogleDrive(file);
    } 
    // For medium files (>20MB), use chunked approach
    else if (file.size > 20 * 1024 * 1024) {
      processLargeFile(file);
    } 
    // For smaller files, use the direct approach
    else {
      onAlbumUploaded(albumName, file);
      toast({
        title: "Album Ready",
        description: "Your album is ready for processing",
      });
    }
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
                <X className="h-4 w-4 mr-2" /> Remove File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-muted p-2 rounded-full mb-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drag and drop your album file here</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: ZIP, RAR, 7Z, PDF, JPG, PNG, WEBP, GIF and other image formats
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 500MB (large files will use Google Drive)
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