// src/pages/_error.tsx
import { NextPageContext } from 'next'
import Error from 'next/error'

type ErrorProps = { statusCode?: number }

const CustomErrorComponent = ({ statusCode = 500 }: ErrorProps) => {
  return <Error statusCode={statusCode} />
}

CustomErrorComponent.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default CustomErrorComponent