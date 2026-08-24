import DeskApp from "@/components/DeskApp";
import { hasExaKey } from "@/lib/exa/client";

export const dynamic = "force-dynamic";

export default function Page() {
  // Read on the server so the browser learns whether a live sweep is possible
  // without ever being handed the key itself.
  const liveReady = hasExaKey() && process.env.DEMO_MODE !== "1";
  return <DeskApp liveReady={liveReady} />;
}
