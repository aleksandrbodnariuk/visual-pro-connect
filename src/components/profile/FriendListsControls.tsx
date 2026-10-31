import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { FRIEND_LIST_NAME_MAX, FRIEND_LIST_PRESETS } from "@/lib/friendLists";
import type { FriendListItem } from "@/hooks/friends/useFriendLists";

interface ManagerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lists: FriendListItem[];
  counts: Record<string, number>;
  createList: (name: string) => Promise<boolean>;
  renameList: (id: string, name: string) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
}

export function FriendListsManager({ open, onOpenChange, lists, counts, createList, renameList, deleteList }: ManagerProps) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const existing = new Set(lists.map((l) => l.name.toLowerCase()));
  const presets = FRIEND_LIST_PRESETS.filter((p) => !existing.has(p.toLowerCase()));

  const add = async () => {
    if (await createList(newName)) setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Мої списки друзів</DialogTitle>
          <DialogDescription>Списки бачите лише ви. Один друг може бути в кількох списках.</DialogDescription>
        </DialogHeader>

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Input
            value={newName}
            maxLength={FRIEND_LIST_NAME_MAX}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Назва нового списку"
            className="h-11"
          />
          <Button type="submit" className="h-11" disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Додати
          </Button>
        </form>

        {presets.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Швидко додати:</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button key={p} variant="outline" size="sm" className="min-h-9" onClick={() => createList(p)}>
                  <Plus className="h-3 w-3 mr-1" /> {p}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
          {lists.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Ще немає жодного списку</p>}
          {lists.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-2 min-h-11">
              {editId === l.id ? (
                <form
                  className="flex flex-1 gap-1"
                  onSubmit={async (e) => { e.preventDefault(); if (await renameList(l.id, editName)) setEditId(null); }}
                >
                  <Input autoFocus value={editName} maxLength={FRIEND_LIST_NAME_MAX} onChange={(e) => setEditName(e.target.value)} className="h-10" />
                  <Button type="submit" size="icon" variant="ghost" className="h-10 w-10" aria-label="Зберегти"><Check className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-10 w-10" aria-label="Скасувати" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                </form>
              ) : confirmId === l.id ? (
                <>
                  <span className="flex-1 text-sm">Видалити «{l.name}»? Друзі залишаться у друзях.</span>
                  <Button size="sm" variant="destructive" onClick={async () => { await deleteList(l.id); setConfirmId(null); }}>Видалити</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Ні</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium truncate">{l.name}</span>
                  <span className="text-xs text-muted-foreground">{counts[l.id] ?? 0}</span>
                  <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Перейменувати" onClick={() => { setEditId(l.id); setEditName(l.name); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" aria-label="Видалити список" onClick={() => setConfirmId(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PickerProps {
  friendName: string;
  lists: FriendListItem[];
  selected: string[];
  onToggle: (listId: string) => void;
  onManage: () => void;
  className?: string;
}

export function FriendListPicker({ friendName, lists, selected, onToggle, onManage, className }: PickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Списки для ${friendName}`}
          className={className ?? "h-9 w-9"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Tags className="h-4 w-4" />
          {selected.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground px-2 pb-2 truncate">{friendName}</p>
        {lists.length === 0 ? (
          <p className="text-sm px-2 pb-2">Ще немає списків.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {lists.map((l) => (
              <label key={l.id} className="flex items-center gap-2 px-2 min-h-10 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={selected.includes(l.id)} onCheckedChange={() => onToggle(l.id)} />
                <span className="text-sm truncate">{l.name}</span>
              </label>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full mt-1 justify-start" onClick={onManage}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Керувати списками
        </Button>
      </PopoverContent>
    </Popover>
  );
}
