
'use client';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';

export type UserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: ('Owner' | 'Admin' | 'Inventory' | 'Sales')[];
}

export function useUserProfile() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userProfileRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [user, firestore]
    );

    const { data: userProfile, ...rest } = useDoc<Omit<UserProfile, 'id'>>(userProfileRef);

    const profileWithId = useMemo(() => 
        userProfile ? { ...userProfile, id: user?.uid ?? '' } : null
    , [userProfile, user]);

    return { userProfile: profileWithId, ...rest };
}
