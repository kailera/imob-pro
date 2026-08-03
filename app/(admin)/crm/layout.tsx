import { CrmNavHeader } from "./components/CrmNavHeader";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-2 md:p-6">
      <CrmNavHeader />
      <div>{children}</div>
    </div>
  );
}
