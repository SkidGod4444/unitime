import { HypertuneProvider } from '../lib/flags/hypertune.react'
import { useAuth } from './auth.cntxt'

export default function FlagsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { loggedInUser } = useAuth()

  return (
    <HypertuneProvider
      createSourceOptions={{
        token: process.env.EXPO_PUBLIC_HYPERTUNE_TOKEN!,
      }}
      rootArgs={{
        context: {
          environment:
            process.env.NODE_ENV === 'development'
              ? 'development'
              : 'production',
          user: loggedInUser
            ? {
                id: loggedInUser.id,
                name: loggedInUser.name,
                email: loggedInUser.email,
              }
            : {
                id: 'anonymous',
                name: 'Anonymous',
                email: 'anonymous@example.com',
              },
        },
      }}
    >
      {children}
    </HypertuneProvider>
  )
}
