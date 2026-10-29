/**
 * Nội dung trang Quyền riêng tư và Điều khoản, theo ngôn ngữ.
 * Mô tả đúng những gì hệ thống đang làm (Supabase Auth, bảng readings/profiles,
 * localStorage, phần "Phân tích chuyên sâu" ghép từ dữ liệu có sẵn, không dùng AI). Khi thêm phân tích, quảng cáo hay thanh toán
 * thì phải cập nhật tại đây và đổi LEGAL_UPDATED.
 */

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalDoc = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export type LegalKind = 'privacy' | 'terms';

export const LEGAL_UPDATED = '2026-10-25';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@example.com';

const privacyVi: LegalDoc = {
  title: 'Chính sách quyền riêng tư',
  intro:
    'Miu Tarot chỉ thu thập những gì cần để vận hành dịch vụ. Trang này giải thích dữ liệu nào được thu thập, dùng để làm gì, lưu ở đâu và bạn kiểm soát nó như thế nào.',
  sections: [
    {
      heading: '1. Dữ liệu chúng tôi thu thập',
      items: [
        'Tên đăng nhập và mật khẩu: để tạo và xác thực tài khoản. Mật khẩu được Supabase Auth băm một chiều, chúng tôi không đọc được. Nếu bạn dùng email thật làm tên đăng nhập thì email đó cũng được lưu.',
        'Lịch sử rút bài: khi bạn đã đăng nhập, mỗi lần rút được lưu gồm kiểu trải bài, bộ bài, chủ đề, các lá bài (và xuôi/ngược), ngôn ngữ và thời gian.',
        'Câu hỏi của bạn (tối đa 200 ký tự), nếu bạn nhập. Đừng nhập thông tin nhạy cảm hoặc định danh người khác vào câu hỏi.',
        'Thiết lập tài khoản: ngôn ngữ ưa dùng và vai trò (người dùng hoặc quản trị).',
        'Dữ liệu kỹ thuật tối thiểu do máy chủ và nhà cung cấp hạ tầng ghi lại để bảo mật và chống lạm dụng, ví dụ địa chỉ IP và nhật ký truy cập.'
      ]
    },
    {
      heading: '2. Dữ liệu lưu trên thiết bị của bạn',
      paragraphs: [
        'Khi chưa đăng nhập, lịch sử rút bài, giao diện sáng/tối và việc bật/tắt linh vật được lưu ngay trong trình duyệt (localStorage) và không gửi đến máy chủ của chúng tôi. Xóa dữ liệu trình duyệt là xóa các thông tin này.'
      ]
    },
    {
      heading: '3. Cookie',
      items: [
        'Cookie phiên đăng nhập do Supabase đặt, cần thiết để giữ bạn đăng nhập.',
        'Cookie ghi nhớ ngôn ngữ giao diện.',
        'Hiện tại chúng tôi không dùng cookie quảng cáo hoặc theo dõi hành vi. Nếu sau này thêm công cụ phân tích, chúng tôi sẽ cập nhật trang này và xin đồng ý khi pháp luật yêu cầu.'
      ]
    },
    {
      heading: '4. Mục đích sử dụng',
      items: [
        'Cung cấp tính năng rút bài, lưu và hiển thị lịch sử.',
        'Xác thực đăng nhập và bảo vệ dịch vụ khỏi lạm dụng.',
        'Ghép phần "Phân tích chuyên sâu" khi bạn chủ động yêu cầu.',
        'Cải thiện nội dung và sửa lỗi, trên cơ sở số liệu tổng hợp, không nhằm nhận diện cá nhân.'
      ],
      paragraphs: ['Chúng tôi không bán dữ liệu cá nhân và không dùng nó để quảng cáo nhắm mục tiêu.']
    },
    {
      heading: '5. Phần "Phân tích chuyên sâu"',
      paragraphs: [
        'Phần này được ghép từ bộ nội dung viết sẵn của Miu Tarot, dựa trên các lá bạn rút, thứ tự các lá, chủ đề và câu hỏi của bạn (hệ thống so khớp từ khóa trong câu hỏi để chọn cách mở đầu phù hợp). Việc ghép diễn ra ngay trên thiết bị của bạn; câu hỏi của bạn không được gửi cho bên thứ ba và không dùng trí tuệ nhân tạo để tạo nội dung tại thời điểm xem.',
        'Nếu câu hỏi cho thấy dấu hiệu khủng hoảng hoặc ý định tự hại, hệ thống sẽ không diễn giải bằng bài mà hiển thị lời nhắn kèm hướng dẫn tìm hỗ trợ.'
      ]
    },
    {
      heading: '6. Nơi lưu trữ và bên xử lý',
      paragraphs: [
        'Dữ liệu tài khoản và lịch sử được lưu trên Supabase (cơ sở dữ liệu và xác thực), có kiểm soát truy cập theo từng người dùng: bạn chỉ đọc, ghi, xóa được lịch sử của chính mình. Nhà cung cấp hạ tầng web xử lý dữ liệu theo yêu cầu của chúng tôi để vận hành dịch vụ. Dữ liệu có thể được xử lý ở nước ngoài.'
      ]
    },
    {
      heading: '7. Thời gian lưu giữ',
      paragraphs: [
        'Lịch sử và tài khoản được giữ cho đến khi bạn xóa hoặc yêu cầu xóa. Sau khi tài khoản bị xóa, dữ liệu liên quan bị xóa theo, trừ nhật ký kỹ thuật được giữ ngắn hạn cho mục đích bảo mật.'
      ]
    },
    {
      heading: '8. Quyền của bạn',
      items: [
        'Xem và xóa từng lần rút bài trong trang Lịch sử.',
        'Yêu cầu truy cập, chỉnh sửa hoặc xóa tài khoản và toàn bộ dữ liệu qua email bên dưới.',
        'Rút lại sự đồng ý đã cho, hoặc phản đối việc xử lý, trong phạm vi pháp luật cho phép.'
      ],
      paragraphs: ['Chúng tôi sẽ phản hồi trong thời gian hợp lý theo quy định pháp luật hiện hành.']
    },
    {
      heading: '9. Trẻ em',
      paragraphs: [
        'Dịch vụ dành cho người từ 18 tuổi trở lên. Chúng tôi không chủ ý thu thập dữ liệu của trẻ em. Nếu phát hiện, chúng tôi sẽ xóa.'
      ]
    },
    {
      heading: '10. Bảo mật',
      paragraphs: [
        'Chúng tôi dùng kết nối mã hóa, phân quyền ở mức dòng dữ liệu và tách khóa bí mật khỏi trình duyệt. Không hệ thống nào an toàn tuyệt đối, vì vậy hãy tránh đưa thông tin quá riêng tư vào câu hỏi.'
      ]
    },
    {
      heading: '11. Thay đổi chính sách',
      paragraphs: [
        `Khi có thay đổi quan trọng, chúng tôi sẽ cập nhật trang này và ngày cập nhật ở đầu trang (hiện là ${LEGAL_UPDATED}).`
      ]
    },
    {
      heading: '12. Liên hệ',
      paragraphs: [`Mọi câu hỏi hoặc yêu cầu về dữ liệu: ${CONTACT_EMAIL}.`]
    }
  ]
};

const termsVi: LegalDoc = {
  title: 'Điều khoản sử dụng',
  intro:
    'Khi dùng Miu Tarot, bạn đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
  sections: [
    {
      heading: '1. Bản chất của dịch vụ',
      paragraphs: [
        'Miu Tarot cung cấp nội dung Tarot mang tính tham khảo và giải trí. Các lá bài là lời gợi mở để bạn suy ngẫm, không phải lời tiên đoán chắc chắn về tương lai và không đảm bảo bất kỳ kết quả nào.'
      ]
    },
    {
      heading: '2. Không phải lời khuyên chuyên môn',
      paragraphs: [
        'Nội dung không phải lời khuyên y tế, tâm lý, pháp lý hay tài chính, và không thay thế chuyên gia. Đừng dựa vào bản đọc để quyết định về sức khỏe, điều trị, đầu tư, vay mượn hay kiện tụng. Nếu bạn đang gặp khủng hoảng hoặc có ý nghĩ làm hại bản thân, hãy liên hệ ngay người thân, cơ sở y tế hoặc đường dây hỗ trợ ở nơi bạn sống.'
      ]
    },
    {
      heading: '3. Phần "Phân tích chuyên sâu"',
      paragraphs: [
        'Phần này được ghép từ nội dung viết sẵn theo các lá bạn rút và câu hỏi của bạn, không phải lời tiên tri hay đánh giá riêng về hoàn cảnh của bạn. Nó có thể không phù hợp với tình huống cụ thể; bạn tự chịu trách nhiệm về cách hiểu và sử dụng nội dung.'
      ]
    },
    {
      heading: '4. Độ tuổi và tài khoản',
      items: [
        'Bạn phải từ 18 tuổi trở lên để sử dụng dịch vụ.',
        'Bạn chịu trách nhiệm về hộp thư dùng để đăng nhập và mọi hoạt động trong tài khoản của mình.',
        'Cung cấp thông tin chính xác và thông báo cho chúng tôi nếu nghi ngờ tài khoản bị truy cập trái phép.'
      ]
    },
    {
      heading: '5. Hành vi không được phép',
      items: [
        'Dùng dịch vụ cho mục đích trái pháp luật, lừa đảo hoặc quấy rối người khác.',
        'Nhập vào câu hỏi nội dung xâm phạm quyền riêng tư của người khác, nội dung thù ghét hoặc bạo lực.',
        'Cố truy cập trái phép, dò quét lỗ hổng, làm quá tải hoặc can thiệp vào hệ thống.',
        'Thu thập hàng loạt nội dung bằng công cụ tự động, hoặc sao chép để bán lại, khi chưa được cho phép.',
        'Dùng bản đọc để đưa ra lời khuyên y tế, pháp lý hoặc tài chính cho người khác như thể đó là lời khuyên chuyên môn.'
      ]
    },
    {
      heading: '6. Sở hữu trí tuệ',
      paragraphs: [
        'Giao diện, minh họa, linh vật, văn bản và mã nguồn của Miu Tarot thuộc về chúng tôi hoặc bên cấp phép. Bạn được dùng cá nhân, phi thương mại, và được chia sẻ kết quả rút bài của mình kèm ghi nguồn. Nội dung bạn nhập vẫn thuộc về bạn; bạn cho phép chúng tôi xử lý nó chỉ để vận hành dịch vụ theo Chính sách quyền riêng tư.'
      ]
    },
    {
      heading: '7. Miễn trừ và giới hạn trách nhiệm',
      paragraphs: [
        'Dịch vụ được cung cấp "như hiện có", có thể gián đoạn hoặc có lỗi. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp hoặc hậu quả phát sinh từ việc bạn dựa vào nội dung. Điều này không loại trừ những trách nhiệm mà pháp luật không cho phép loại trừ.'
      ]
    },
    {
      heading: '8. Tạm ngừng và chấm dứt',
      paragraphs: [
        'Chúng tôi có thể hạn chế hoặc xóa tài khoản vi phạm điều khoản. Bạn có thể ngừng dùng dịch vụ và yêu cầu xóa tài khoản bất cứ lúc nào.'
      ]
    },
    {
      heading: '9. Thay đổi điều khoản',
      paragraphs: [
        `Chúng tôi có thể cập nhật điều khoản và sẽ đổi ngày cập nhật ở đầu trang (hiện là ${LEGAL_UPDATED}). Tiếp tục sử dụng sau khi cập nhật nghĩa là bạn chấp nhận bản mới.`
      ]
    },
    {
      heading: '10. Luật áp dụng và liên hệ',
      paragraphs: [
        `Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Liên hệ: ${CONTACT_EMAIL}.`
      ]
    }
  ]
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  intro:
    'Miu Tarot collects only what it needs to run the service. This page explains what data we collect, why, where it is stored, and how you control it.',
  sections: [
    {
      heading: '1. Data we collect',
      items: [
        'Username and password: used to create and authenticate your account. The password is hashed by Supabase Auth and we cannot read it. If you use a real email address as your username, that email is stored too.',
        'Reading history: when signed in, each reading is saved with its spread, deck, topic, cards (and upright/reversed), language and time.',
        'Your question (up to 200 characters), if you enter one. Please do not include sensitive information or details that identify other people.',
        'Account settings: preferred language and role (user or admin).',
        'Minimal technical data logged by our servers and infrastructure providers for security and abuse prevention, such as IP address and access logs.'
      ]
    },
    {
      heading: '2. Data stored on your device',
      paragraphs: [
        'When you are not signed in, your reading history, light/dark theme and the companion toggle are stored in your browser (localStorage) and are not sent to our servers. Clearing your browser data removes them.'
      ]
    },
    {
      heading: '3. Cookies',
      items: [
        'A session cookie set by Supabase, required to keep you signed in.',
        'A cookie that remembers your interface language.',
        'We currently use no advertising or behavioral-tracking cookies. If we add analytics later, we will update this page and ask for consent where the law requires it.'
      ]
    },
    {
      heading: '4. How we use data',
      items: [
        'To provide card drawing and to save and show your history.',
        'To authenticate sign-in and protect the service from abuse.',
        'To assemble the "In-depth analysis" when you ask for it.',
        'To improve content and fix bugs, using aggregated figures and not to identify individuals.'
      ],
      paragraphs: ['We do not sell personal data and do not use it for targeted advertising.']
    },
    {
      heading: '5. The "In-depth analysis"',
      paragraphs: [
        'This section is assembled from pre-written Miu Tarot content, based on the cards you draw, their order, the topic and your question (the system matches keywords in your question to choose a fitting opening). Assembly happens on your device; your question is not sent to any third party and no artificial intelligence is used to generate content at viewing time.',
        'If a question shows signs of crisis or self-harm, the system does not interpret it with cards and instead shows a supportive message with guidance on finding help.'
      ]
    },
    {
      heading: '6. Storage and processors',
      paragraphs: [
        'Account and history data is stored on Supabase (database and authentication) with per-user access control: you can read, write and delete only your own history. Web infrastructure providers process data on our behalf to run the service. Data may be processed outside your country.'
      ]
    },
    {
      heading: '7. Retention',
      paragraphs: [
        'History and account data are kept until you delete them or ask us to. When an account is deleted, related data is deleted with it, except short-lived technical logs kept for security.'
      ]
    },
    {
      heading: '8. Your rights',
      items: [
        'View and delete individual readings on the History page.',
        'Ask for access, correction or deletion of your account and all data by emailing the address below.',
        'Withdraw consent you have given, or object to processing, as far as the law allows.'
      ],
      paragraphs: ['We will respond within a reasonable time as required by applicable law.']
    },
    {
      heading: '9. Children',
      paragraphs: [
        'The service is for people aged 18 and over. We do not knowingly collect children’s data and will delete it if we find any.'
      ]
    },
    {
      heading: '10. Security',
      paragraphs: [
        'We use encrypted connections, row-level access rules, and keep secret keys out of the browser. No system is perfectly secure, so please avoid putting very private details in questions.'
      ]
    },
    {
      heading: '11. Changes',
      paragraphs: [
        `When we make material changes we will update this page and the date at the top (currently ${LEGAL_UPDATED}).`
      ]
    },
    {
      heading: '12. Contact',
      paragraphs: [`For questions or data requests: ${CONTACT_EMAIL}.`]
    }
  ]
};

const termsEn: LegalDoc = {
  title: 'Terms of Use',
  intro:
    'By using Miu Tarot you agree to these terms. If you do not agree, please stop using the service.',
  sections: [
    {
      heading: '1. What the service is',
      paragraphs: [
        'Miu Tarot provides tarot content for reference and entertainment. The cards are prompts for reflection, not certain predictions of the future, and guarantee no outcome.'
      ]
    },
    {
      heading: '2. Not professional advice',
      paragraphs: [
        'Content is not medical, psychological, legal or financial advice and is no substitute for a professional. Do not rely on a reading to decide about health, treatment, investing, borrowing or litigation. If you are in crisis or have thoughts of harming yourself, contact someone you trust, a health provider, or a support line where you live.'
      ]
    },
    {
      heading: '3. The "In-depth analysis"',
      paragraphs: [
        'This section is assembled from pre-written content according to the cards you draw and your question. It is not a prophecy or a personal assessment of your circumstances and may not fit your specific situation; you are responsible for how you interpret and use it.'
      ]
    },
    {
      heading: '4. Age and accounts',
      items: [
        'You must be 18 or older to use the service.',
        'You are responsible for the mailbox you sign in with and all activity in your account.',
        'Give accurate information and tell us if you suspect unauthorized access.'
      ]
    },
    {
      heading: '5. Prohibited conduct',
      items: [
        'Using the service for unlawful, fraudulent or harassing purposes.',
        'Entering content in questions that violates others’ privacy, or is hateful or violent.',
        'Attempting unauthorized access, probing for vulnerabilities, overloading or interfering with the system.',
        'Bulk-scraping content with automated tools, or copying it for resale, without permission.',
        'Presenting a reading to others as professional medical, legal or financial advice.'
      ]
    },
    {
      heading: '6. Intellectual property',
      paragraphs: [
        'The interface, artwork, mascot, text and code of Miu Tarot belong to us or our licensors. You may use it for personal, non-commercial purposes and share your own reading results with attribution. Content you enter remains yours; you allow us to process it only to run the service as described in the Privacy Policy.'
      ]
    },
    {
      heading: '7. Disclaimer and limits of liability',
      paragraphs: [
        'The service is provided “as is” and may be interrupted or contain errors. To the extent the law allows, we are not liable for indirect or consequential loss arising from your reliance on the content. This does not exclude liability that cannot be excluded by law.'
      ]
    },
    {
      heading: '8. Suspension and termination',
      paragraphs: [
        'We may restrict or delete accounts that breach these terms. You may stop using the service and ask to delete your account at any time.'
      ]
    },
    {
      heading: '9. Changes to the terms',
      paragraphs: [
        `We may update these terms and will change the date at the top (currently ${LEGAL_UPDATED}). Continuing to use the service after an update means you accept the new version.`
      ]
    },
    {
      heading: '10. Governing law and contact',
      paragraphs: [`These terms are governed by the laws of Vietnam. Contact: ${CONTACT_EMAIL}.`]
    }
  ]
};

export const LEGAL_DOCS: Record<'vi' | 'en', Record<LegalKind, LegalDoc>> = {
  vi: { privacy: privacyVi, terms: termsVi },
  en: { privacy: privacyEn, terms: termsEn }
};

export const getLegalDoc = (locale: string, kind: LegalKind): LegalDoc =>
  LEGAL_DOCS[locale === 'en' ? 'en' : 'vi'][kind];
