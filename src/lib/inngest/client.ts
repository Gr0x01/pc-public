import { EventSchemas, Inngest } from "inngest";

type Events = {
  "pipeline/enrich.requested": {
    data: {
      limit?: number;
      itemTypeFilter?: string;
    };
  };
  "alerts/urgent.requested": {
    data: {
      itemId: string;
    };
  };
  "email/product-nudge": {
    data: {
      userId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "policy-canary",
  schemas: new EventSchemas().fromRecord<Events>(),
});
