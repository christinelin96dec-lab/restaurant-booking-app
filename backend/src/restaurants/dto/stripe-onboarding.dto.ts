import { IsOptional, IsUrl } from 'class-validator';

export class StripeOnboardingLinkDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  refreshUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
