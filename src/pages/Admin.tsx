
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const { tabName } = useParams<{ tabName: string }>();
  const { appUser: currentUser, isAuthenticated, loading } = useAuth();
  
  const loadUsersData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_for_admin');
      if (error) {
        console.error('Error loading users from Supabase:', error);
        return;
      }
      
      setUsers(data || []);
      
      const shareholdersData = (data || []).filter((user: any) => {
        const isFounder = user.founder_admin || user.phone_number === '0507068007';
        const isShareholder = user.is_shareholder === true;
        return isFounder || isShareholder;
      });
      
      setShareholders(shareholdersData);
    } catch (error) {
      console.error('Error in loadUsersData:', error);
    }
  };

  // Redirect to default tab
  useEffect(() => {
    if (!tabName) {
      navigate("/admin/users", { replace: true });
    }
  }, [tabName, navigate]);

  // Load data when user is confirmed admin
  useEffect(() => {
    if (loading) return;
    if (!currentUser) return;
    if (!currentUser.isAdmin && !currentUser.founder_admin) return;
    
    loadUsersData();

    const handleShareholderUpdate = () => loadUsersData();

    window.addEventListener('shareholder-status-updated', handleShareholderUpdate);
    window.addEventListener('storage', loadUsersData);

    return () => {
      window.removeEventListener('shareholder-status-updated', handleShareholderUpdate);
      window.removeEventListener('storage', loadUsersData);
    };
  }, [loading, currentUser?.id]);

  if (loading || (isAuthenticated && !currentUser)) {
    return <div className="container py-16 text-center">Завантаження...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    navigate("/auth");
    return null;
  }

  if (!currentUser.isAdmin && !currentUser.founder_admin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель адміністратора</h1>
            <p className="text-muted-foreground">Управління сайтом Спільнота B&C</p>
            
            {currentUser.founder_admin && (
              <Badge variant="secondary" className="mt-2">
                Адміністратор-засновник
              </Badge>
            )}
          </div>
        </div>
        
        <AdminStats 
          users={users.length}
          shareholders={shareholders.length}
          stockPrice={stockPrice}
        />
        
        <AdminTabs />
      </div>
    </div>
  );
}
