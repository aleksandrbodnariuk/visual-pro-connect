
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  profession?: string;
}

const suggestedUsers: SuggestedUser[] = [
  {
    id: "user4",
    name: "Олена Сидоренко",
    username: "elena_photo",
    avatarUrl: "https://i.pravatar.cc/150?img=24",
    profession: "Photo"
  },
  {
    id: "user5",
    name: "Денис Коваль",
    username: "denys_video",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    profession: "Video"
  },
  {
    id: "user6",
    name: "Анна Михайленко",
    username: "anna_event",
    avatarUrl: "https://i.pravatar.cc/150?img=16",
    profession: "Event"
  },
  {
    id: "user7",
    name: "Роман Шевченко",
    username: "roman_music",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    profession: "Music"
  },
  {
    id: "user8",
    name: "Сергій Лисенко",
    username: "serhii_pyro",
    avatarUrl: "https://i.pravatar.cc/150?img=57",
    profession: "Pyro"
  },
];

export function Sidebar() {
  return (
    <aside className="sticky top-20 hidden w-[350px] shrink-0 xl:block">
      <div className="mb-6 rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-semibold">Рекомендації для вас</h2>
        <div className="space-y-4">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <Link to={`/profile/${user.id}`} className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                    {user.profession && (
                      <span className={`profession-badge profession-badge-${user.profession.toLowerCase()} text-[10px]`}>
                        {user.profession}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Підписатися
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-semibold">Популярні події</h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-secondary/10 to-accent/10 p-3">
            <h3 className="font-medium">Фестиваль фотографії 2023</h3>
            <p className="text-sm text-muted-foreground">Київ, 15-20 травня</p>
            <Button variant="link" className="mt-1 h-auto p-0 text-sm text-secondary">
              Дізнатися більше
            </Button>
          </div>
          <div className="rounded-lg bg-gradient-to-r from-destructive/10 to-secondary/10 p-3">
            <h3 className="font-medium">Майстер-клас з відеомонтажу</h3>
            <p className="text-sm text-muted-foreground">Онлайн, 28 травня</p>
            <Button variant="link" className="mt-1 h-auto p-0 text-sm text-secondary">
              Дізнатися більше
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-2">
          <Link to="#" className="hover:underline">Про нас</Link>
          <Link to="#" className="hover:underline">Допомога</Link>
          <Link to="#" className="hover:underline">API</Link>
          <Link to="#" className="hover:underline">Вакансії</Link>
          <Link to="#" className="hover:underline">Умови</Link>
          <Link to="#" className="hover:underline">Конфіденційність</Link>
        </div>
        <div className="mt-4">© 2023 Visual Pro Connect</div>
      </div>
    </aside>
  );
}
