import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signOutEverywhere,
  signUpWithPassword,
} from '../lib/auth'
import { SESSION_KEY } from './useSession'

import type { Credentials } from '../lib/auth'

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: function (creds: Credentials) {
      return signInWithPassword(creds)
    },
    onSuccess: function (session) {
      queryClient.setQueryData(SESSION_KEY, session)
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: function (creds: Credentials) {
      return signUpWithPassword(creds)
    },
    onSuccess: function (session) {
      queryClient.setQueryData(SESSION_KEY, session)
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: function () {
      return signOutEverywhere()
    },
    onSuccess: function () {
      queryClient.setQueryData(SESSION_KEY, null)
    },
  })
}

export function usePasswordReset() {
  return useMutation({
    mutationFn: function (email: string) {
      return sendPasswordReset(email)
    },
  })
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: function () {
      return signInWithGoogle()
    },
  })
}
