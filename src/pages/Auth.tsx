
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Plane, Phone, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InkSplashEffect } from '@/components/InkSplashEffect';

export default function Auth() {
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [inkSplash, setInkSplash] = useState({ active: false, x: 0, y: 0 });
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    linkfacebook: '',
  });

  // useEffect(() => {
  //   if (user) {
  //     navigate('/');
  //   }
  // }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    // Get button position for ink splash effect
    const buttonRect = loginButtonRef.current?.getBoundingClientRect();
    const clickX = buttonRect ? buttonRect.left + buttonRect.width / 2 : window.innerWidth / 2;
    const clickY = buttonRect ? buttonRect.top + buttonRect.height / 2 : window.innerHeight / 2;

    try {
      const { error } = await signIn(signInForm.email, signInForm.password);
      
      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast({
            variant: "destructive",
            title: "Lỗi đăng nhập",
            description: "Email hoặc mật khẩu không chính xác",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi đăng nhập",
            description: error.message,
          });
        }
      } else {
        // Trigger ink splash effect on successful login
        setInkSplash({ active: true, x: clickX, y: clickY });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    if (signUpForm.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    if (!signUpForm.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số điện thoại là bắt buộc",
      });
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await signUp(
        signUpForm.email,
        signUpForm.password,
        signUpForm.fullName,
        signUpForm.phone,
        signUpForm.linkfacebook
      );

      if (error) {
        if (error.message === 'User already registered') {
          toast({
            variant: "destructive",
            title: "Lỗi đăng ký",
            description: "Email này đã được đăng ký",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi đăng ký",
            description: error.message,
          });
        }
      } else {
        toast({
          title: "Đăng ký thành công",
          description: "Tài khoản đã được tạo. Vui lòng liên hệ admin để kích hoạt tài khoản.",
        });
        setActiveTab('signin');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Plane className="h-8 w-8 text-blue-600 mr-2" />
            <CardTitle className="text-2xl font-bold text-blue-600">FlightSearch</CardTitle>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Đăng nhập để sử dụng dịch vụ tìm kiếm chuyến bay
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
              <TabsTrigger value="signup">Đăng ký</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button 
                  ref={loginButtonRef}
                  type="submit" 
                  className="w-full" 
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="pl-10"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+84 123 456 789"
                      className="pl-10"
                      value={signUpForm.phone}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-facebook">Link Facebook (tùy chọn)</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-facebook"
                      type="url"
                      placeholder="https://facebook.com/yourprofile"
                      className="pl-10"
                      value={signUpForm.linkfacebook}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, linkfacebook: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng ký...
                    </>
                  ) : (
                    'Đăng ký'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <InkSplashEffect
        isActive={inkSplash.active}
        x={inkSplash.x}
        y={inkSplash.y}
        onComplete={() => {
          setInkSplash({ active: false, x: 0, y: 0 });
          navigate('/'); // Navigate sau khi splash xong
        }}

      />
    </div>
  );
}
