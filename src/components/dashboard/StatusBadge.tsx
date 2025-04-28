import { OrderStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: OrderStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Acknowledged":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Printing":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusColor()} font-medium`}>
      {status}
    </Badge>
  );
};
