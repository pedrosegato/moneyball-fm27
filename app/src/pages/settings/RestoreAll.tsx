import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { RestoreAllDialog } from "./RestoreAllDialog";
import { Row } from "./Row";
import { Section } from "./Section";

export function RestoreAll() {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  return (
    <Section title={t("restoreAll.title")}>
      <Row label={t("restoreAll.label")} description={t("restoreAll.hint")}>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {t("restoreAll.open")}
        </Button>
      </Row>
      <RestoreAllDialog open={open} onOpenChange={setOpen} />
    </Section>
  );
}
