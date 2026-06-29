import { resolveQlab5ImportReport, useQlab5ImportReportStore } from "../stores/qlab5-import-prompt";
import { Qlab5ImportReportDialog } from "./Qlab5ImportReportDialog";

export function Qlab5ImportReportDialogHost() {
  const open = useQlab5ImportReportStore((s) => s.open);
  const result = useQlab5ImportReportStore((s) => s.result);

  return (
    <Qlab5ImportReportDialog
      open={open}
      projectName={result?.projectName ?? ""}
      report={result?.report ?? null}
      onClose={resolveQlab5ImportReport}
    />
  );
}
