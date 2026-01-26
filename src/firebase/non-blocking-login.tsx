'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    console.error("Anonymous sign-in error:", error);
    toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Could not sign in anonymously. Please try again later.",
    });
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    if (error.code === 'auth/email-already-in-use') {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "An account with this email address already exists.",
        });
    } else {
        console.error("Sign-up error:", error);
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: error.message,
        });
    }
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
        if (error.code === 'auth/invalid-credential') {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Incorrect email or password. Please try again.",
            });
        } else {
            console.error("Sign-in error:", error);
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "An unexpected error occurred. Please try again.",
            });
        }
    });
}
