import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'agent' | 'subcon-admin' | 'subcon-clerk' | 'worker';
  company?: string | { _id: string; name: string };
  companies?: (string | { _id: string; name: string })[]; // For agents - multiple companies
  worker?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: User['role'];
  company?: string;
  companies?: string[]; // For agents - multiple companies
  isActive?: boolean;
}

// Generate a random password
export function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Fetch all users
export function useUsers(query: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async () => {
      const result = await feathersClient.service('users').find({
        query: {
          $limit: 100,
          $sort: { createdAt: -1 },
          ...query
        }
      });
      return result.data || result;
    }
  });
}

// Fetch single user
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      return feathersClient.service('users').get(id);
    },
    enabled: !!id
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      return feathersClient.service('users').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return feathersClient.service('users').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return feathersClient.service('users').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

// Reset user password
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      return feathersClient.service('users').patch(id, { password: newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

