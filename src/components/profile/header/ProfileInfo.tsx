
import { MapPin, Link as LinkIcon, Calendar } from "lucide-react";

interface ProfileInfoProps {
  name: string;
  username: string;
  profession?: string;
  location?: string;
  website?: string;
  joinDate: string;
}

export function ProfileInfo({ name, username, profession, location, website, joinDate }: ProfileInfoProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{name !== "undefined undefined" ? name : "Користувач"}</h1>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">@{username}</span>
        {profession && (
          <span className={`profession-badge profession-badge-${profession.toLowerCase()}`}>
            {profession}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
        {location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-1">
            <LinkIcon className="h-4 w-4" />
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              {website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>Приєднався {joinDate}</span>
        </div>
      </div>
    </div>
  );
}
