
import { useState, useEffect } from 'react';
import { Users, Settings, DollarSign, Mail, User, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  price_markup: number;
  status: string;
  created_at: string;
}

export const AdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    price_markup: 0,
    role: 'user',
    status: 'active',
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể tải danh sách người dùng",
        });
      } else {
        setProfiles(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      full_name: profile.full_name || '',
      price_markup: profile.price_markup || 0,
      role: profile.role,
      status: profile.status,
    });
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          price_markup: editForm.price_markup,
          role: editForm.role,
          status: editForm.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProfile.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể cập nhật thông tin người dùng",
        });
      } else {
        toast({
          title: "Thành công",
          description: "Đã cập nhật thông tin người dùng",
        });
        fetchProfiles();
        setEditingProfile(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="destructive">Admin</Badge>
    ) : (
      <Badge variant="secondary">User</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Pending</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-red-600 border-red-600">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Quản lý người dùng và cấu hình hệ thống
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Xin chào, {profile?.full_name || profile?.email}
              </p>
              <Badge variant="destructive" className="mt-1">Admin</Badge>
            </div>
            <Button onClick={signOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
              <p className="text-xs text-muted-foreground">
                +{profiles.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} tuần này
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng Admin</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => p.role === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Tài khoản quản trị viên
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phí cộng thêm trung bình</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(Math.round(profiles.reduce((sum, p) => sum + (p.price_markup || 0), 0) / profiles.length || 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Giá trị cộng thêm trung bình
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Phí cộng thêm</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">
                        {profile.full_name || 'Chưa cập nhật'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{profile.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(profile.role)}</TableCell>
                    <TableCell>{getStatusBadge(profile.status)}</TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {formatCurrency(profile.price_markup || 0)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(profile.created_at)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProfile(profile)}
                          >
                            Chỉnh sửa
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Chỉnh sửa thông tin người dùng</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="full_name">Họ và tên</Label>
                              <Input
                                id="full_name"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Nhập họ và tên"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price_markup">Phí cộng thêm (VND)</Label>
                              <Input
                                id="price_markup"
                                type="number"
                                value={editForm.price_markup}
                                onChange={(e) => setEditForm(prev => ({ ...prev, price_markup: parseFloat(e.target.value) || 0 }))}
                                placeholder="0"
                                min="0"
                                step="1000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="role">Vai trò</Label>
                              <select
                                id="role"
                                value={editForm.role}
                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="status">Trạng thái</Label>
                              <select
                                id="status"
                                value={editForm.status}
                                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              >
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                            <Button onClick={handleUpdateProfile} className="w-full">
                              Cập nhật
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
