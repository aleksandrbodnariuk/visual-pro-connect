import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const accountSchema = z.object({
  full_name: z.string().min(2, 'Ім\'я має бути не менше 2 символів').max(100),
  phone_number: z.string().min(10, 'Введіть коректний номер телефону'),
  email: z.string().email('Введіть коректний email'),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'Пароль має бути не менше 6 символів').optional().or(z.literal('')),
  confirm_password: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.new_password && data.new_password !== data.confirm_password) {
    return false;
  }
  return true;
}, {
  message: 'Паролі не співпадають',
  path: ['confirm_password'],
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountSettingsProps {
  userId: string;
  userData: {
    full_name?: string;
    phone_number?: string;
    email?: string;
  };
}

export function AccountSettings({ userId, userData }: AccountSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      full_name: userData.full_name || '',
      phone_number: userData.phone_number || '',
      email: userData.email || '',
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    setIsLoading(true);
    try {
      // Оновлюємо профіль користувача
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          phone_number: data.phone_number,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Оновлюємо email якщо він змінився
      if (data.email !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (emailError) throw emailError;
        toast.success('На вашу пошту надіслано лист для підтвердження нового email');
      }

      // Оновлюємо пароль якщо вказано новий
      if (data.new_password && data.new_password.length > 0) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: data.new_password,
        });
        if (passwordError) throw passwordError;
        toast.success('Пароль успішно змінено');
      }

      // Оновлюємо localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.id === userId) {
        currentUser.full_name = data.full_name;
        currentUser.phone_number = data.phone_number;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

      toast.success('Дані успішно оновлено');
      
      // Очищаємо поля паролів
      reset({
        ...data,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      console.error('Помилка оновлення:', error);
      toast.error(error.message || 'Не вдалося оновити дані');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Акаунт</CardTitle>
        <CardDescription>Налаштування вашого акаунту</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Основні дані */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Повне ім'я</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Введіть ваше повне ім'я"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Номер телефону</Label>
              <Input
                id="phone_number"
                {...register('phone_number')}
                placeholder="+380..."
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                При зміні email вам буде надіслано лист для підтвердження
              </p>
            </div>
          </div>

          {/* Зміна пароля */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="mb-4"
            >
              {isChangingPassword ? 'Скасувати зміну пароля' : 'Змінити пароль'}
            </Button>

            {isChangingPassword && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">Новий пароль</Label>
                  <Input
                    id="new_password"
                    type="password"
                    {...register('new_password')}
                    placeholder="Мінімум 6 символів"
                  />
                  {errors.new_password && (
                    <p className="text-sm text-destructive">{errors.new_password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Підтвердіть новий пароль</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    {...register('confirm_password')}
                    placeholder="Введіть пароль ще раз"
                  />
                  {errors.confirm_password && (
                    <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти зміни
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
