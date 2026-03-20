import SecretViewer from "../../../components/SecretViewer";

type ServerProps = {
  params: { token: string } | Promise<{ token: string }>;
};

export default async function SecretPage({ params }: ServerProps) {
  const { token } = (await params) as { token: string };
  return <SecretViewer token={token} />;
}