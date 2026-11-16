export function ClubAndDate({ club, date }: { club: string | null; date: string | null }) {
  return (
    <>
      {club && <span className="mr-2 max-w-36 truncate font-medium text-fg-secondary">{club}</span>}
      {club && date && " "}
      {date && <span className="shrink-0">{date}</span>}
    </>
  );
}
