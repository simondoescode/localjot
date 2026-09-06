import { useCallback, useEffect, useState } from "react";

function formatStorage(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function useStorageInfo() {
  const [info, setInfo] = useState({
    usageLabel: "Checking storage…",
    percent: 0,
    remainingLabel: "Nothing leaves this device",
  });

  const refresh = useCallback(async () => {
    if (!navigator.storage?.estimate) {
      setInfo({ usageLabel: "Storage estimate unavailable", percent: 0, remainingLabel: "Nothing leaves this device" });
      return;
    }
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const remaining = Math.max(0, quota - usage);
      const percent = quota ? Math.min(100, (usage / quota) * 100) : 0;
      setInfo({
        usageLabel: `${formatStorage(usage)} used`,
        percent,
        remainingLabel: quota ? `${formatStorage(remaining)} remaining` : "Storage available",
      });
    } catch {
      setInfo({ usageLabel: "Storage estimate unavailable", percent: 0, remainingLabel: "Nothing leaves this device" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...info, refresh };
}
