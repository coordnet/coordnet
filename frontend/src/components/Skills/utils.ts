import { HocuspocusProvider } from "@hocuspocus/provider";
import { prosemirrorJSONToYXmlFragment, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";

import { getSkillRun } from "@/api";
import { crdtUrl } from "@/constants";
import { readOnlyEditor } from "@/lib/readOnlyEditor";
import { CustomError } from "@/lib/utils";
import { SkillJson, SkillRun } from "@/types";

export const formatSkillRunId = (id: string): string => {
  return id.split("-")[0];
};

export const loadDisconnectedDoc = async (
  name: string,
  token: string,
  document: Y.Doc
): Promise<Y.Doc> => {
  return new Promise((resolve, reject) => {
    const tmpDoc = new Y.Doc();
    new HocuspocusProvider({
      url: crdtUrl,
      name,
      document: tmpDoc,
      token,
      preserveConnection: false,
      onAuthenticationFailed(data) {
        reject(
          new CustomError({
            code: "ERR_PERMISSION_DENIED",
            name: "Space Websocket Authentication Failed",
            message: data.reason,
          })
        );
      },
      onSynced() {
        const json = skillYdocToJson(tmpDoc);
        skillJsonToYdoc(json, document);
        return resolve(document);
      },
    });
  });
};

export const addSkillRunToYdoc = async (runId: string, document: Y.Doc): Promise<Y.Doc> => {
  const run = (await getSkillRun(runId)) as SkillRun;
  await skillJsonToYdoc(run.method_data, document);
  return document;
};

export const skillJsonToYdoc = async (json: { [k: string]: unknown }, document: Y.Doc) => {
  Object.entries(json).map(([key, value]) => {
    if (key.endsWith("-document")) {
      const xml = document.getXmlFragment(key);
      prosemirrorJSONToYXmlFragment(readOnlyEditor.schema, value, xml);
    } else {
      const nodes = document.getMap(key);
      Object.entries(value as SkillRun["method_data"]).map(([key, value]) => {
        nodes.set(key, value);
      });
    }
  });
  return document;
};

export const skillYdocToJson = (document: Y.Doc) => {
  const json: SkillJson = {};
  for (const key of document.share.keys()) {
    if (key.endsWith("-document")) {
      json[key] = yDocToProsemirrorJSON(document, key);
    } else {
      json[key] = document.getMap(key).toJSON();
    }
  }
  return json;
};
