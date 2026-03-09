import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ShareholderSection } from "@/components/profile/ShareholderSection";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function ShareholderPanel() {
  const navigate = useNavigate();
  const { appUser, isAuthenticated, loading } = useAuth();
  const [isShareholder, setIsShareholder] = useState<boolean | null>(null);
  const [shares, setShares] = useState(0);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;
      if (!isAuthenticated || !appUser) {
        navigate("/auth");
        return;
      }

      // Check if user is shareholder via role
      const { data: hasRole } = await supabase.rpc('has_role', {
        _user_id: appUser.id,
        _role: 'shareholder' as any
      });

      const isFounder = appUser.founder_admin === true;
      
      if (!hasRole && !isFounder) {
        navigate("/");
        return;
      }

      setIsShareholder(true);

      // Fetch shares
      const { data: sharesData } = await supabase
        .from('shares')
        .select('quantity')
        .eq('user_id', appUser.id)
        .maybeSingle();
      
      setShares(sharesData?.quantity ?? 0);
    };

    checkAccess();
  }, [loading, isAuthenticated, appUser, navigate]);

  if (loading || isShareholder === null) {
    return (
      <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
        <Navbar />
        <div className="container py-8 text-center">Завантаження...</div>
      </div>
    );
  }

  const user = {
    id: appUser!.id,
    shares,
    isShareHolder: true,
  };

  return (
    <div className="min-h-screen pt-14 sm:pt-16 3xl:pt-20 pb-safe-nav">
      <Navbar />
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Панель акціонера</h1>
        <ShareholderSection user={user} />
      </div>
    </div>
  );
}
