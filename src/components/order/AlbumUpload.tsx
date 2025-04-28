import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Album } from "@/lib/types";

interface AlbumUploadProps {
  onAlbumUploaded: (albumName: string, file: File) => void;
}

export const AlbumUpload = ({ onAlbumUploaded }: AlbumUploadProps) => {
  const { toast } = useToast();
  const [albumName, setAlbumName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleSubmit = () => {
    if (!file || !albumName.trim()) {
      toast({
        title: "Error",
        description: "Please provide an album name and upload a file",
        variant: "destructive",
      });
      return;
    }
    
    onAlbumUploaded(albumName, file);
    toast({
      title: "Album Ready",
      description: "Your album is ready for processing",
    });
  };

  const clearFile = () => {
    setFile(null);
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
                ? "border-green-500 bg-green-50" 
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
              <div className="bg-green-100 p-2 rounded-full mb-2">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium mb-1">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
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
            </div>
          )}
        </div>
      </div>

      <Button 
        type="button"
        className="w-full mt-4"
        disabled={!file || !albumName.trim()}
        onClick={handleSubmit}
      >
        Continue to Order Details
      </Button>
    </div>
  );
};