import { t } from "../i18n/t";
import { getPlatform } from "../platform";
import {
  deleteStoredWebProject,
  discardTemporaryProjectRoot,
  exportProjectBundle,
  importProjectBundle,
  listStoredWebProjects,
  openDroppedProjectDir,
  openProject,
  openStoredWebProject,
  persistPlatformProject,
} from "../platform/project-storage";
import { requestDeleteStoredProjectChoice } from "../stores/delete-stored-project-prompt";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { requestUnsavedProjectChoice } from "../stores/unsaved-project-prompt";
import { requestWebOpenProjectsChoice } from "../stores/web-open-projects-prompt";
import { notifyWarning } from "./notifications";
import { canEditProject } from "./show-mode";
import { isProjectUnsaved } from "./unsaved-project";

async function prepareToSwitchProject(): Promise<boolean> {
  if (getPlatform() === "tauri" && isProjectUnsaved()) {
    const choice = await requestUnsavedProjectChoice(useProjectStore.getState().name);
    if (choice === "cancel") return false;
    if (choice === "save") {
      await saveProjectFile();
      if (useProjectLocationStore.getState().isTemporaryRoot) return false;
    }
  } else {
    await persistPlatformProject();
  }
  return true;
}

function pickWebBundleFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,.gsc.zip,application/zip";
    input.hidden = true;
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function openProjectFile(): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") {
    await openProject();
    return;
  }

  const projects = await listStoredWebProjects();
  const choice = await requestWebOpenProjectsChoice(projects);
  if (choice.type === "cancel") return;
  if (!(await prepareToSwitchProject())) return;

  if (choice.type === "import") {
    const file = await pickWebBundleFile();
    if (file) {
      await importProjectBundle(file);
    }
    return;
  }

  const opened = await openStoredWebProject(choice.projectId);
  if (!opened) {
    notifyWarning(t("notification.openProjectFailed"));
  }
}

export async function openRecentProjectPath(path: string): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() !== "tauri") return;

  if (isProjectUnsaved()) {
    const choice = await requestUnsavedProjectChoice(useProjectStore.getState().name);
    if (choice === "cancel") return;
    if (choice === "save") {
      await saveProjectFile();
      if (useProjectLocationStore.getState().isTemporaryRoot) return;
    }
    const { rootDir, isTemporaryRoot } = useProjectLocationStore.getState();
    if (isTemporaryRoot && rootDir) {
      await discardTemporaryProjectRoot(rootDir);
    }
  } else {
    await persistPlatformProject();
  }

  const opened = await openDroppedProjectDir(path);
  if (!opened) {
    notifyWarning(t("notification.openProjectFailed"));
  }
}

export async function deleteStoredProjectFile(
  projectId: string,
  projectName: string,
): Promise<boolean> {
  if (!canEditProject()) return false;
  if (getPlatform() === "tauri") return false;

  const confirmed = await requestDeleteStoredProjectChoice(projectName);
  if (!confirmed) return false;

  const deleted = await deleteStoredWebProject(projectId);
  if (!deleted) {
    notifyWarning(t("notification.deleteProjectFailed"));
  }
  return deleted;
}

export async function openStoredProjectFile(projectId: string): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") return;
  if (!(await prepareToSwitchProject())) return;

  const opened = await openStoredWebProject(projectId);
  if (!opened) {
    notifyWarning(t("notification.openProjectFailed"));
  }
}

export async function saveProjectFile(): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") {
    await persistPlatformProject({ promptForLocation: true });
    return;
  }
  const { missing } = await exportProjectBundle();
  if (missing.length > 0) {
    notifyWarning(t("notification.exportMissingAssets", { count: missing.length }));
  }
}
