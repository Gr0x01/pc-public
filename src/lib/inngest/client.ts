import { EventSchemas, Inngest } from "inngest";

type Events = {
  "pipeline/enrich.requested": {
    data: {
      limit?: number;
      itemTypeFilter?: string;
    };
  };
};

export const inngest = new Inngest({
  id: "policy-canary",
  schemas: new EventSchemas().fromRecord<Events>(),
});
