import raw from "@/data/cards.json";
import { validateCards } from "./schema";
import type { Card } from "./types";

export const CARDS: Card[] = validateCards(raw);
