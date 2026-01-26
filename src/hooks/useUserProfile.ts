'use client';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export type UserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: ('Owner' | 'Admin' | 'Warehouse Manager' | 'Sales')[];
}

export function useUserProfile() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userProfileRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [user, firestore]
    );

    const { data: userProfile, ...rest } = useDoc<Omit<UserProfile, 'id'>>(userProfileRef);

    const profileWithId = userProfile ? { ...userProfile, id: user?.uid ?? '' } : null;

    return { userProfile: profileWithId, ...rest };
}
