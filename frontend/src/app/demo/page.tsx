import PaymentGateway from '@/components/payments/PaymentGateway';

export const metadata = {
  title: 'QNexus | Linked Invoice-to-Payment Demo',
  description: 'One verified chain: invoice image, exact approval, post-quantum payment and signed settlement receipt.',
};

export default function DemoPage() { return <PaymentGateway />; }
