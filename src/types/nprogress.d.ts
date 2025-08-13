// src/global.d.ts
declare module 'nprogress' {
  export interface NProgressOptions {
    minimum?: number
    easing?: string
    speed?: number
    trickle?: boolean
    trickleSpeed?: number
    showSpinner?: boolean
    parent?: string
    template?: string
  }

  interface NProgressStatic {
    configure(options: NProgressOptions): void
    start(): NProgressStatic
    set(n: number): NProgressStatic
    inc(amount?: number): NProgressStatic
    done(force?: boolean): NProgressStatic
    remove(): void
    status: number | null
  }

  const NProgress: NProgressStatic
  export default NProgress
}