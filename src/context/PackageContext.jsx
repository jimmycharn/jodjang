import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PackageContext = createContext();

export const PackageProvider = ({ children }) => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setPackages(data);
    } catch (e) {
      console.error('Fetch packages error:', e);
    }
  };

  const userVisiblePackages = useMemo(() => {
    return packages.filter(p => p.user_visible !== false);
  }, [packages]);

  const fetchSubscription = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*, packages(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          await supabase
            .from('user_subscriptions')
            .update({ status: 'expired' })
            .eq('id', data.id);
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } else {
        setSubscription(null);
      }
    } catch (e) {
      console.error('Fetch subscription error:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentPackage = useMemo(() => {
    if (subscription?.packages) return subscription.packages;
    return packages.find(p => p.slug === 'free') || null;
  }, [subscription, packages]);

  const features = useMemo(() => {
    const defaultFeatures = {
      voice: false,
      max_wallets: 1,
      wallet_edit: false,
      csv_export: false,
      transfer: false
    };
    if (!currentPackage?.features) return defaultFeatures;
    return { ...defaultFeatures, ...currentPackage.features };
  }, [currentPackage]);

  const isPremium = useMemo(() => {
    return currentPackage?.slug !== 'free' && currentPackage?.slug !== undefined;
  }, [currentPackage]);

  const subscribe = async (packageId, paymentMethod = 'manual') => {
    if (!user) return { success: false, message: 'กรุณาเข้าสู่ระบบ' };
    try {
      let pkg = packages.find(p => p.id === packageId);
      if (!pkg) {
        const { data: pkgData } = await supabase.from('packages').select('*').eq('id', packageId).single();
        if (!pkgData) return { success: false, message: 'ไม่พบแพ็คเกจ' };
        pkg = pkgData;
      }

      if (pkg.slug === 'free') {
        // Cancel current subscription
        if (subscription) {
          await supabase
            .from('user_subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscription.id);
        }
        setSubscription(null);
        return { success: true };
      }

      // Cancel existing active subscription
      if (subscription) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription.id);
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + pkg.duration_days);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          package_id: packageId,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_amount: pkg.price,
          payment_method: paymentMethod
        })
        .select('*, packages(*)')
        .single();

      if (error) return { success: false, message: error.message };

      setSubscription(data);
      return { success: true, subscription: data };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const adminAssignPackage = async (targetUserId, packageId, durationDays) => {
    try {
      // Cancel existing active subscription for target user
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', targetUserId)
        .eq('status', 'active');

      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) return { success: false, message: 'ไม่พบแพ็คเกจ' };

      if (pkg.slug === 'free') {
        return { success: true };
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + (durationDays || pkg.duration_days));

      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: targetUserId,
          package_id: packageId,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_amount: 0,
          payment_method: 'admin_assigned'
        });

      if (error) return { success: false, message: error.message };
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  return (
    <PackageContext.Provider value={{
      packages,
      userVisiblePackages,
      subscription,
      currentPackage,
      features,
      isPremium,
      loading,
      subscribe,
      adminAssignPackage,
      fetchPackages,
      fetchSubscription
    }}>
      {children}
    </PackageContext.Provider>
  );
};

export const usePackage = () => useContext(PackageContext);

export default PackageContext;
