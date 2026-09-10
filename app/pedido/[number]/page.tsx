import { OrderTracking } from '@/components/order-tracking';

export const metadata = {
  title: 'Tu pedido | Perfumes El Padrino',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  return <OrderTracking number={number} />;
}
