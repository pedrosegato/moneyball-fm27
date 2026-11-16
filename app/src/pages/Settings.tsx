import { Page } from "@/components/Page";
import { CONFIG_SECTION } from "@/shell/routeIds";
import { CompositesEditor } from "./CompositesEditor";
import { General } from "./settings/General";
import { SectionNav } from "./settings/SectionNav";

interface SettingsProps {
  section?: typeof CONFIG_SECTION.composites;
  item?: string;
}

export function Settings({ section, item }: SettingsProps) {
  return (
    <Page>
      <SectionNav current={section ?? CONFIG_SECTION.general} />
      {section === CONFIG_SECTION.composites ? <CompositesEditor item={item} /> : <General />}
    </Page>
  );
}
