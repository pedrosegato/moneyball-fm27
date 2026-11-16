import { useTranslation } from "react-i18next";

export function RoomCard({ room }: { room: number }) {
  const { t } = useTranslation("compare");
  return (
    <div className="flex flex-col justify-center gap-1 rounded-xl border border-dashed border-line p-4 text-fg-muted">
      <p className="type-label text-fg-secondary">{t(room === 1 ? "room.one" : "room.two")}</p>
      <p className="type-caption">{t("room.hint")}</p>
    </div>
  );
}
