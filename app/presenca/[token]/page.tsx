import { CheckinFlow } from "./CheckinFlow";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CheckinFlow token={token} />;
}
