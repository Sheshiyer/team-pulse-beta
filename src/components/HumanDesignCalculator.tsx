import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { HDProfile } from "../types/humanDesign";

interface Props {
  profile: HDProfile;
}

export function HumanDesignCalculator({ profile }: Props) {
  const markdown = `
# Human Design Profile Details

## 🎭 Core Aspects
- **Type**: ${profile.type}
- **Authority**: ${profile.authority}
- **Profile**: ${profile.profile.join("/")}
- **Definition**: ${profile.definition}

## ⚡️ Energy Centers
${Object.entries(profile.centers)
  .map(([center, defined]) => `- ${defined ? "🟢" : "⚪️"} ${center}`)
  .join("\n")}

## 🔮 Gates & Channels
### Active Gates
${profile.gates.map((gate) => `- Gate ${gate}`).join("\n")}

### Active Channels
${profile.channels.map((channel) => `- ${channel[0]} ⟷ ${channel[1]}`).join("\n")}

## 🌟 Incarnation Cross
${profile.incarnationCross}

## 🧬 Variables
${profile.variables.map((variable) => `- ${variable}`).join("\n")}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Type"
            text={profile.type}
            icon={{ source: Icon.Person, tintColor: Color.Purple }}
          />
          <Detail.Metadata.Label
            title="Authority"
            text={profile.authority}
            icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Label
            title="Profile"
            text={profile.profile.join("/")}
            icon={{ source: Icon.Circle, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Energy Centers">
            {Object.entries(profile.centers).map(([center, defined]) => (
              <Detail.Metadata.TagList.Item
                key={center}
                text={center}
                color={defined ? Color.Green : Color.SecondaryText}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Definition"
            text={profile.definition}
            icon={{ source: Icon.Circle, tintColor: Color.Red }}
          />
          <Detail.Metadata.Label
            title="Incarnation Cross"
            text={profile.incarnationCross}
            icon={{ source: Icon.Stars, tintColor: Color.Orange }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Profile Summary"
            content={`Type: ${profile.type}\nAuthority: ${profile.authority}\nProfile: ${profile.profile.join("/")}\nIncarnation Cross: ${profile.incarnationCross}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
