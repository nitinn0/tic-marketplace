import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

/**
 * Development transport: writes messages to the application log and keeps a small in-memory
 * outbox so local runs and tests can read invitation links without an external provider.
 */
class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('MailLogTransport');

  constructor(private readonly outbox: MailMessage[]) {}

  async send(message: MailMessage) {
    this.outbox.push(message);
    if (this.outbox.length > 50) {
      this.outbox.shift();
    }
    this.logger.log(`To: ${message.to} | Subject: ${message.subject}\n${message.text}`);
  }
}

@Injectable()
export class MailService {
  private readonly outbox: MailMessage[] = [];
  private readonly transport: MailTransport;

  constructor(private readonly configService: ConfigService) {
    const transportName = this.configService.get<string>('MAIL_TRANSPORT') ?? 'log';
    switch (transportName) {
      case 'log':
        this.transport = new LogMailTransport(this.outbox);
        break;
      default:
        throw new Error(`Unsupported MAIL_TRANSPORT "${transportName}"`);
    }
  }

  async send(message: MailMessage) {
    await this.transport.send(message);
  }

  getOutbox(): readonly MailMessage[] {
    return this.outbox;
  }
}
