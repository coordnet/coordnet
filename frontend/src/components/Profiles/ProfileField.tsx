import clsx from "clsx";
import Downshift, { ControllerStateAndHelpers } from "downshift";
import { X } from "lucide-react";
import { matchSorter } from "match-sorter";
import React, { useEffect, useState } from "react";

import { Profile } from "@/types";

import { getProfileImage } from "./utils";

const ProfileField: React.FC<{
  data: Profile[];
  className?: string;
  limit?: number;
  initialValue?: string[];
  onSelectionItemsChange: (selectedItems: Profile[]) => void;
}> = ({ data, className, limit, initialValue, onSelectionItemsChange }) => {
  const [selectedItems, setSelectedItems] = useState<Profile[]>([]);
  const itemToString = (item: Profile | null) => {
    return item && item.id ? item.id : "";
  };

  useEffect(() => {
    if (initialValue?.length && data) {
      const initialProfiles = data.filter((profile) => initialValue.includes(profile.id));
      if (initialProfiles.length) {
        setSelectedItems(initialProfiles);
      }
    }
  }, [data, initialValue]);

  /* Helper functions */
  const changeHandler = (
    selectedItems: Profile[],
    setSelectedItems: React.Dispatch<React.SetStateAction<Profile[]>>,
    onSelectionItemsChange: (selectedItems: Profile[]) => void,
    limit?: number,
  ) => {
    return (selectedItem: Profile | null, downshift: ControllerStateAndHelpers<Profile>) => {
      if (!selectedItem) return;
      const i = selectedItems.findIndex((item) => item.id === selectedItem.id);
      if (i === -1) {
        let newSelectedItems;
        if (limit === 1) {
          // Replace the previous item
          newSelectedItems = [selectedItem];
        } else {
          if (limit && selectedItems.length >= limit) {
            // Do not add new item if limit is reached
            return;
          }
          newSelectedItems = [...selectedItems, selectedItem];
        }
        setSelectedItems(newSelectedItems);
        onSelectionItemsChange(newSelectedItems);
      }
      downshift.clearSelection();
    };
  };

  const removeSelectedItemByIndex = (
    i: number,
    selectedItems: Profile[],
    setSelectedItems: React.Dispatch<React.SetStateAction<Profile[]>>,
    onSelectionItemsChange: (selectedItems: Profile[]) => void,
  ) => {
    const temp = [...selectedItems];
    temp.splice(i, 1);
    setSelectedItems(temp);
    onSelectionItemsChange(temp);
  };

  return (
    <Downshift
      onChange={changeHandler(selectedItems, setSelectedItems, onSelectionItemsChange, limit)}
      itemToString={itemToString}
    >
      {({ getInputProps, getMenuProps, getItemProps, highlightedIndex, isOpen, inputValue }) => {
        // Remove selected items from the list
        const results = matchSorter(
          data.filter((item) => !selectedItems.includes(item)),
          inputValue ?? "",
          { keys: ["title", "profile_slug"] },
        );

        return (
          <div>
            <div
              className={clsx(
                "flex items-center flex-wrap gap-2 w-full rounded-md border bg-white px-2.5 py-2 text-sm focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2",
                className,
              )}
            >
              {selectedItems.map((value, i) => {
                return (
                  <div
                    key={value.id}
                    className="h-6 px-2 bg-profile-tag rounded-full justify-start items-center gap-2 inline-flex select-none"
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${getProfileImage(value)})`,
                      }}
                    />
                    <div className="text-neutral-900 text-sm font-normal flex-shrink-0 leading-normal">
                      {value.title}
                    </div>
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        removeSelectedItemByIndex(
                          i,
                          selectedItems,
                          setSelectedItems,
                          onSelectionItemsChange,
                        )
                      }
                    >
                      <X className="size-3 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
              <input
                {...getInputProps({
                  onKeyUp: (e) => {
                    if (e.key === "Backspace" && !inputValue && selectedItems.length) {
                      removeSelectedItemByIndex(
                        selectedItems.length - 1,
                        selectedItems,
                        setSelectedItems,
                        onSelectionItemsChange,
                      );
                    }
                  },
                })}
                type="text"
                className="h-6 focus:outline-none ?disabled:bg-white flex-auto"
              />
            </div>

            <ul
              {...getMenuProps({
                className: clsx(
                  "absolute w-full",
                  isOpen &&
                    results.length &&
                    "border border-gray-300 bg-white rounded-md mt-1 max-h-[200px] overflow-auto z-20",
                ),
              })}
            >
              {isOpen
                ? results.map((item, index) => {
                    return (
                      <li
                        key={item.id}
                        {...getItemProps({
                          item,
                          className: clsx(
                            "px-3 py-2 flex items-center gap-2 cursor-pointer",
                            index === highlightedIndex && "bg-gray-200",
                          ),
                        })}
                      >
                        <div
                          className="w-4 h-4 rounded-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${getProfileImage(item)})`,
                          }}
                        />
                        <div className="text-neutral-900 text-sm font-normal flex-shrink-0 leading-normal">
                          {item.title}
                        </div>
                      </li>
                    );
                  })
                : null}
            </ul>
          </div>
        );
      }}
    </Downshift>
  );
};

export default ProfileField;
