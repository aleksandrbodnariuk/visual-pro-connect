
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { deleteUser, changeUserStatus, toggleShareholderStatus } from "@/hooks/users/userManagement";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuspended, setShowSuspended] = useState(false);
  const [processingShareholderIds, setProcessingShareholderIds] = useState<string[]>([]);
  
  const navigate = useNavigate();
  
  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    
    // Listen for shareholder status updates
    const handleShareholderStatusUpdate = (e: CustomEvent) => {
      if (e.detail?.userId) {
        fetchUsers(); // Reload all users to reflect changes
      }
    };
    
    window.addEventListener('shareholder-status-updated', handleShareholderStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('shareholder-status-updated', handleShareholderStatusUpdate as EventListener);
    };
  }, []);
  
  // Filter users when search term or showSuspended changes
  useEffect(() => {
    filterUsers();
  }, [searchTerm, showSuspended, users]);
  
  const fetchUsers = async () => {
    try {
      // Try to get users from Supabase
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) {
        console.warn("Error fetching users from Supabase:", error);
      }
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        setUsers(supabaseUsers);
      } else {
        // Fall back to localStorage
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        setUsers(storedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      // Fall back to localStorage
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      setUsers(storedUsers);
    }
  };
  
  const filterUsers = () => {
    let filtered = [...users];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.firstName?.toLowerCase().includes(term) || '') ||
        (user.lastName?.toLowerCase().includes(term) || '') ||
        (user.phoneNumber?.includes(term) || '') ||
        (user.full_name?.toLowerCase().includes(term) || '')
      );
    }
    
    // Filter by suspended status
    if (showSuspended) {
      filtered = filtered.filter(user => 
        user.status === "Заблоковано" || user.full_name === "Заблоковано"
      );
    }
    
    setFilteredUsers(filtered);
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Ви впевнені, що хочете видалити цього користувача?")) {
      const success = await deleteUser(userId);
      if (success) {
        fetchUsers();
      }
    }
  };
  
  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };
  
  const handleToggleShareHolder = async (userId: string, currentValue: boolean) => {
    setProcessingShareholderIds(prev => [...prev, userId]);
    
    try {
      const success = await toggleShareholderStatus(userId, !currentValue);
      if (success) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error toggling shareholder status:", error);
      toast.error("Помилка зміни статусу акціонера");
    } finally {
      setProcessingShareholderIds(prev => prev.filter(id => id !== userId));
    }
  };
  
  const getUserDisplayName = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.full_name) {
      return user.full_name;
    } else {
      return "Невідомий користувач";
    }
  };
  
  const getInitials = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    } else if (user.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
      }
      return parts[0].charAt(0);
    }
    return 'КР';
  };
  
  const getStatus = (user: any) => {
    if (user.status) return user.status;
    if (user.full_name && user.full_name !== getUserDisplayName(user)) return user.full_name;
    return "Активний";
  };
  
  const isShareHolder = (user: any) => {
    return user.isShareHolder || user.is_shareholder || user.status === "Акціонер";
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Input
          placeholder="Пошук за ім'ям або номером телефону"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-[300px]"
        />
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-suspended"
            checked={showSuspended}
            onCheckedChange={setShowSuspended}
          />
          <label htmlFor="show-suspended" className="text-sm">
            Показати заблокованих
          </label>
        </div>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Ім'я</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Акціонер</TableHead>
              <TableHead>Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs truncate max-w-[100px]">
                    {user.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={user.avatarUrl || user.avatar_url} 
                          alt={getUserDisplayName(user)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = 'none';
                          }}
                        />
                        <AvatarFallback>
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{getUserDisplayName(user)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.phoneNumber || 'Не вказано'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatus(user) === "Заблоковано" ? "destructive" : "secondary"}>
                      {getStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={isShareHolder(user)}
                      onCheckedChange={() => handleToggleShareHolder(user.id, isShareHolder(user))}
                      disabled={processingShareholderIds.includes(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewProfile(user.id)}
                      >
                        <UserRound className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Видалити
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Користувачів не знайдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
