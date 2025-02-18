import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { serializeError } from "serialize-error";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { getProfileCards, updateProfileCards } from "@/api";
import { DialogContent } from "@/components/ui/dialog";
import { Profile, ProfileCard as ProfileCardType } from "@/types";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ProfileSkillCard from "./ProfileSkillCard";

const searchCards = (data: ProfileCardType[], searchString: string): ProfileCardType[] => {
  // Trim the search string and convert to lowercase for case-insensitive search
  const trimmedSearch = searchString.trim().toLowerCase();

  // If the search string is empty, return all results
  if (trimmedSearch === "") {
    return data;
  }

  // Filter the results based on the presence of the search string in title or description
  return data.filter((card) => {
    const titleMatch = card.title.toLowerCase().includes(trimmedSearch);
    const descriptionMatch = card.description.toLowerCase().includes(trimmedSearch);
    return titleMatch || descriptionMatch;
  });
};

const ProfileCardFind = ({
  profile,
  setOpen,
  className,
}: {
  profile: Profile;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile-cards"],
    queryFn: ({ signal }) => getProfileCards(signal),
    refetchInterval: false,
    retry: false,
    initialData: [],
  });

  const [input, setInput] = useState<string>("");
  const [cards, setCards] = useState<ProfileCardType[]>([]);
  const [debouncedInput] = useDebounceValue(input, 100);

  const onAddCard = async (id: string) => {
    const newCards = [...profile.cards.map((card) => card.id), id];
    try {
      await updateProfileCards(profile.id, newCards);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile-cards"] });
      setOpen(false);
    } catch (error) {
      const serializedError = serializeError(error);
      toast.error(serializedError.message);
    }
  };

  const onChange = useCallback(
    async (value: string) => {
      const availableCards = data?.filter(
        (card) => !profile.cards.map((c) => c.id).includes(card.id)
      );
      if (value === "") {
        setCards([]);
      } else {
        setCards(searchCards(availableCards, value));
      }
    },
    [profile, data]
  );

  useEffect(() => {
    onChange(debouncedInput);
  }, [debouncedInput, onChange]);

  return (
    <DialogContent
      showCloseButton={false}
      aria-describedby={undefined}
      className={clsx(
        `flex h-fit max-h-[90%] w-[90%] max-w-[580px] flex-col !rounded-2xl
        bg-profile-modal-gradient p-0 outline-none`,
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-3">Loading...</div>
      ) : (
        <div className="flex flex-col gap-4 overflow-scroll p-3">
          <Input
            placeholder="Search for a card"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {input !== "" && cards.length === 0 ? (
            <div className="flex items-center justify-center p-2 text-gray-500">No results</div>
          ) : cards.length ? (
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3">
              {cards.map((card, i) => (
                <div className="relative" key={`${i}-${card.id}`}>
                  <Button
                    className="absolute right-2 top-2 z-10 bg-violet-700 hover:bg-violet-800"
                    size="sm"
                    onClick={() => onAddCard(card.id)}
                  >
                    <Plus className="mr-1 size-4" />
                    Add
                  </Button>
                  <ProfileSkillCard card={card} />
                </div>
              ))}
            </div>
          ) : (
            <></>
          )}
        </div>
      )}
    </DialogContent>
  );
};

export default ProfileCardFind;
