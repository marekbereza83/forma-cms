import './globals.css'

export const metadata = {
  title: 'FORMA CMS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
