import { useState } from "react";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";

export function CueListTabs() {
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const cueLists = useProjectStore((s) => s.cueLists);
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);
  const addCueList = useProjectStore((s) => s.addCueList);
  const removeCueList = useProjectStore((s) => s.removeCueList);
  const renameCueList = useProjectStore((s) => s.renameCueList);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (listId: string, currentName: string) => {
    setRenamingId(listId);
    setRenameValue(currentName);
  };

  const commitRename = (listId: string) => {
    renameCueList(listId, renameValue);
    setRenamingId(null);
  };

  return (
    <div className="cue-list-tabs" role="tablist" aria-label="Cue lists">
      {cueLists.map((list) => {
        const active = list.id === activeCueListId;
        const topLevelCount = list.cues.filter((c) => !c.parentId).length;

        if (renamingId === list.id) {
          return (
            <input
              key={list.id}
              className="cue-list-tab-input"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.currentTarget.value)}
              onBlur={() => commitRename(list.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(list.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }

        return (
          <button
            key={list.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={["cue-list-tab", active && "cue-list-tab-active"]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveCueList(list.id)}
            onDoubleClick={
              canEdit
                ? (e) => {
                    e.stopPropagation();
                    startRename(list.id, list.name);
                  }
                : undefined
            }
            title={
              canEdit
                ? `${list.name} (${topLevelCount} cues). Double-click to rename.`
                : `${list.name} (${topLevelCount} cues)`
            }
          >
            <span className="cue-list-tab-name">{list.name}</span>
            <span className="cue-list-tab-count">{topLevelCount}</span>
            {canEdit && cueLists.length > 1 && (
              <span
                className="cue-list-tab-close"
                role="button"
                tabIndex={-1}
                aria-label={`Close ${list.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeCueList(list.id);
                }}
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      {canEdit && (
        <button
          type="button"
          className="cue-list-tab cue-list-tab-add"
          title="New cue list"
          aria-label="New cue list"
          onClick={() => addCueList()}
        >
          +
        </button>
      )}
    </div>
  );
}
