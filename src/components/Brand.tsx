// src/components/Brand.tsx
import Image from 'next/image'

type Props = {
  className?: string
  size?: number
  showText?: boolean
}

export default function Brand({ className = '', size = 32, showText = true }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="Aimnesis"
        width={size}
        height={size}
        priority
      />
      {showText && (
        <span className="text-xl font-semibold tracking-tight">
          Aimnesis
        </span>
      )}
    </div>
  )
}