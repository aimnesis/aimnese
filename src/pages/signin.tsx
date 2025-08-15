import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/auth/signin', permanent: false },
})

export default function SignInAlias() { return null }