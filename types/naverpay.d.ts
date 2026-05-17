/** 네이버페이 JS SDK — https://docs.pay.naver.com/docs/onetime-payment/payment/payment-auth-window */

interface NaverPayOpenParams {
  merchantPayKey: string
  merchantUserKey?: string
  productName: string
  totalPayAmount: number
  taxScopeAmount: number
  taxExScopeAmount: number
  productCount: number
  returnUrl: string
  productItems: Array<{
    categoryType: string
    categoryId: string
    uid: string
    name: string
    payReferrer?: string
    count: number
  }>
}

interface NaverPayCreateParams {
  mode?: 'development' | 'production'
  clientId: string
  chainId: string
  payType?: string
  openType?: string
  onAuthorize?: (data: {
    resultCode: string
    resultMessage?: string
    paymentId?: string
    returnUrl?: string
  }) => void
}

interface NaverPayInstance {
  open(params: NaverPayOpenParams): void
  close(): void
}

interface NaverPayNamespace {
  create(params: NaverPayCreateParams): NaverPayInstance
}

declare global {
  interface Window {
    Naver?: {
      Pay: NaverPayNamespace
    }
  }
}

export {}
