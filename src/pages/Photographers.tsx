import { useState, useEffect } from "react";
import { deletePhotographer } from "@/lib/api";
import { getPhotographers } from "@/lib/services/userService";
import { User } from "@/lib/types";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Photographers = () => {
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [photographerToDelete, setPhotographerToDelete] = useState<User | null>(null);

  useEffect(() => {
    const loadPhotographers = async () => {
      try {
        setLoading(true);
        const data = await getPhotographers();
        setPhotographers(data);
        setError(null);
      } catch (err) {
        console.error("Error loading photographers:", err);
        setError("Failed to load photographers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadPhotographers();
  }, []);

  const handleDeletePhotographer = async () => {
    if (!photographerToDelete) return;
    
    try {
      setLoading(true);
      await deletePhotographer(photographerToDelete._id || photographerToDelete.id || '');
      
      // Remove the deleted photographer from the state
      setPhotographers(prev => prev.filter(p => 
        (p._id || p.id) !== (photographerToDelete._id || photographerToDelete.id)
      ));
      
      toast({
        title: "Photographer Deleted",
        description: `${photographerToDelete.name} has been removed successfully.`,
      });
    } catch (err) {
      console.error("Error deleting photographer:", err);
      toast({
        title: "Error",
        description: "Failed to delete photographer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPhotographerToDelete(null);
    }
  };

  const filteredPhotographers = photographers.filter(photographer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      photographer.name?.toLowerCase().includes(searchLower) ||
      photographer.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Photographers</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search photographers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Loading photographers...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filteredPhotographers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No photographers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPhotographers.map((photographer) => (
                  <TableRow key={photographer._id || photographer.id}>
                    <TableCell className="font-medium py-2 sm:py-4 truncate max-w-[120px] sm:max-w-none">
                      {photographer.name}
                    </TableCell>
                    <TableCell className="py-2 sm:py-4 truncate max-w-[120px] sm:max-w-none">
                      {photographer.email}
                    </TableCell>
                    <TableCell className="py-2 sm:py-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setPhotographerToDelete(photographer)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Photographer</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {photographer.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPhotographerToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePhotographer}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Photographers;
