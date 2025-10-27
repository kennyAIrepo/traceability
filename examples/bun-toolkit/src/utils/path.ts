import * as path from "path";
import * as os from "os";

/**
 * Expand ~ to home directory in paths
 * @param filepath Path that may contain ~
 * @returns Expanded absolute path
 */
export function expandPath(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
}
