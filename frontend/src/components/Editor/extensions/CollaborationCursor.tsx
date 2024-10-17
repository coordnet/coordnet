/* eslint @typescript-eslint/no-explicit-any: 0 */
import { Extension } from "@tiptap/core";
import { DecorationAttrs } from "@tiptap/pm/view";
import { defaultSelectionBuilder, yCursorPlugin } from "y-prosemirror";

type CollaborationCursorStorage = {
  users: { clientId: number; [key: string]: any }[];
};

export interface CollaborationCursorOptions {
  provider: any;
  user: Record<string, any>;
  render(user: Record<string, any>): HTMLElement;
  selectionRender(user: Record<string, any>): DecorationAttrs;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaborationCursor: {
      /**
       * Update details of the current user
       */
      updateUser: (attributes: Record<string, any>) => ReturnType;
    };
  }
}

const awarenessStatesToArray = (states: Map<number, Record<string, any>>) => {
  return Array.from(states.entries()).map(([key, value]) => {
    return {
      clientId: key,
      ...value.user,
    };
  });
};

function getTransparentColor(hexcolor: string, a = 0.5) {
  const r = Math.floor(parseInt(hexcolor.substring(1, 3), 16) * a + 0xff * (1 - a));
  const g = Math.floor(parseInt(hexcolor.substring(3, 5), 16) * a + 0xff * (1 - a));
  const b = Math.floor(parseInt(hexcolor.substring(5, 7), 16) * a + 0xff * (1 - a));

  return "#" + ((r << 16) | (g << 8) | b).toString(16);
}

export const CollaborationCursor = Extension.create<
  CollaborationCursorOptions,
  CollaborationCursorStorage
>({
  name: "collaborationCursor",

  addOptions() {
    return {
      provider: null,
      user: {
        name: null,
        color: null,
      },
      render: (user) => {
        const cursor = document.createElement("span");

        cursor.classList.add("collaboration-cursor__caret");
        cursor.setAttribute("style", `border-color: ${user.color}`);

        const wrapper = document.createElement("div");
        wrapper.classList.add("collaboration-cursor__wrapper");

        const img = document.createElement("img");
        img.src = user.image;
        wrapper.append(img);

        const label = document.createElement("div");
        label.classList.add("collaboration-cursor__label");
        label.insertBefore(document.createTextNode(user.displayName), null);
        label.setAttribute("style", `background-color: ${getTransparentColor(user.color, 0.65)}`);
        wrapper.append(label);

        cursor.insertBefore(wrapper, null);

        return cursor;
      },
      selectionRender: defaultSelectionBuilder,
    };
  },

  addStorage() {
    return {
      users: [],
    };
  },

  addCommands() {
    return {
      updateUser: (attributes) => () => {
        this.options.user = attributes;

        this.options.provider.awareness.setLocalStateField("user", this.options.user);

        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      yCursorPlugin(
        (() => {
          this.options.provider.awareness.setLocalStateField("user", this.options.user);

          this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);

          this.options.provider.awareness.on("update", () => {
            this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
          });

          return this.options.provider.awareness;
        })(),
        {
          cursorBuilder: this.options.render,
          selectionBuilder: this.options.selectionRender,
        },
      ),
    ];
  },
});
